#!/usr/bin/env python
# Copyright 2016 Cisco Systems, Inc.  All rights reserved.
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

from __init__ import __version__

from concurrent.futures import ThreadPoolExecutor
import datetime
import importlib
import json
import os
import sys
import threading
import time
import traceback
import webbrowser

import base_compute
import base_network
from cinderclient import client as cinderclient
from glanceclient import exc as glance_exception
from glanceclient.v2 import client as glanceclient
from kb_config import KBConfig
from kb_res_logger import KBResLogger
from kb_runner_base import KBException
from kb_runner_http import KBRunner_HTTP
from kb_runner_multicast import KBRunner_Multicast
from kb_runner_storage import KBRunner_Storage
from kb_scheduler import KBScheduler

import keystoneauth1
from keystoneclient.v2_0 import client as keystoneclient

import log as logging
from neutronclient.neutron import client as neutronclient
from novaclient import client as novaclient
from oslo_config import cfg
from pkg_resources import resource_filename
from pkg_resources import resource_string
from tabulate import tabulate
import tenant

CONF = cfg.CONF
LOG = logging.getLogger(__name__)


class KBVMCreationException(Exception):
    pass


class KBFlavorCheckException(Exception):
    pass


# flavor names to use
FLAVOR_KB_PROXY = 'KB.proxy'
FLAVOR_KB_CLIENT = 'KB.client'
FLAVOR_KB_SERVER = 'KB.server'


class Kloud(object):
    def __init__(self, scale_cfg, cred, reusing_tenants, vm_img,
                 testing_side=False, storage_mode=False, multicast_mode=False):
        self.tenant_list = []
        self.testing_side = testing_side
        self.scale_cfg = scale_cfg
        self.reusing_tenants = reusing_tenants
        self.storage_mode = storage_mode
        self.multicast_mode = multicast_mode
        self.credentials = cred
        self.osclient_session = cred.get_session()
        self.vm_up_count = 0
        self.res_logger = KBResLogger()
        self.vm_img = vm_img
        if testing_side:
            self.prefix = 'KBc'
            self.name = 'Client Kloud'
        else:
            self.prefix = 'KBs'
            self.name = 'Server Kloud'
        # pre-compute the placement az to use for all VMs
        self.placement_az = scale_cfg['availability_zone'] \
            if scale_cfg['availability_zone'] else None
        self.exc_info = None
        # these client handles use the kloudbuster credentials (usually admin)
        # to do tenant creation, tenant nova+cinder quota allocation and the like
        self.keystone = keystoneclient.Client(session=self.osclient_session)
        self.neutron_client = neutronclient.Client('2.0', endpoint_type='publicURL',
                                                   session=self.osclient_session)
        self.nova_client = novaclient.Client('2', endpoint_type='publicURL',
                                             session=self.osclient_session)
        self.cinder_client = cinderclient.Client('2', endpoint_type='publicURL',
                                                 session=self.osclient_session)
        LOG.info("Creating kloud: " + self.prefix)
        if self.placement_az:
            LOG.info('%s Availability Zone: %s' % (self.name, self.placement_az))
        # A dict of flavors indexed by flavor name
        self.flavors = {}

    def select_flavor(self):
        # Select an existing flavor that Flavor check
        flavor_manager = base_compute.Flavor(self.nova_client)
        fcand = {'vcpus': sys.maxint, 'ram': sys.maxint, 'disk': sys.maxint}
        # find the smallest flavor that is at least 1vcpu, 1024MB ram and 10MB disk
        for flavor in flavor_manager.list():
            flavor = vars(flavor)
            if flavor['vcpus'] < 1 or flavor['ram'] < 1024 or flavor['disk'] < 10:
                continue
            if flavor['vcpus'] < fcand['vcpus']:
                fcand = flavor
            elif flavor['vcpus'] == fcand['vcpus']:
                if flavor['ram'] < fcand['ram']:
                    fcand = flavor
                elif flavor['ram'] == fcand['ram'] and flavor['disk'] < fcand['disk']:
                    fcand = flavor
            find_flag = True

        if find_flag:
            LOG.info('Automatically selecting flavor %s to instantiate VMs.' % fcand['name'])
            return fcand
        LOG.error('Cannot find a flavor which meets the minimum '
                  'requirements to instantiate VMs.')
        raise KBFlavorCheckException()

    def create_resources(self, tenant_quota):
        def create_flavor(fm, name, flavor_dict, extra_specs):
            flavor_dict['name'] = name
            flv = fm.create_flavor(flavor_dict)
            if extra_specs:
                flv.set_keys(extra_specs)
            self.flavors[name] = flv
            self.res_logger.log('flavors', vars(flv)['name'], vars(flv)['id'])

        if self.reusing_tenants:
            for tenant_info in self.reusing_tenants:
                tenant_name = tenant_info['name']
                user_list = tenant_info['user']
                tenant_instance = tenant.Tenant(tenant_name, self, tenant_quota,
                                                reusing_users=user_list)
                self.tenant_list.append(tenant_instance)
        else:
            for tenant_count in xrange(self.scale_cfg['number_tenants']):
                tenant_name = self.prefix + "-T" + str(tenant_count)
                tenant_instance = tenant.Tenant(tenant_name, self, tenant_quota)
                self.res_logger.log('tenants', tenant_instance.tenant_name,
                                    tenant_instance.tenant_id)
                self.tenant_list.append(tenant_instance)

        for tenant_instance in self.tenant_list:
            tenant_instance.create_resources()

        # Create/reuse flavors for this cloud
        if self.reusing_tenants:
            # If tenants are reused, we do not create new flavors but pick one
            # existing that is good enough
            flavor = self.select_flavor()
            if self.testing_side:
                self.flavors[FLAVOR_KB_PROXY] = flavor
                self.flavors[FLAVOR_KB_CLIENT] = flavor
            else:
                self.flavors[FLAVOR_KB_SERVER] = flavor
        else:
            # Create flavors for servers, clients, and kb-proxy nodes
            nova_client = self.tenant_list[0].user_list[0].nova_client
            flavor_manager = base_compute.Flavor(nova_client)
            flavor_dict = self.scale_cfg.flavor
            extra_specs = flavor_dict.pop('extra_specs', None)

            if self.storage_mode:
                flavor_dict['ephemeral'] = self.scale_cfg['storage_stage_configs']['disk_size'] \
                    if self.scale_cfg['storage_stage_configs']['target'] == 'ephemeral' else 0
            else:
                flavor_dict['ephemeral'] = 0
            if self.testing_side:
                proxy_flavor = {
                    "vcpus": 1,
                    "ram": 2048,
                    "disk": 0,
                    "ephemeral": 0
                }
                create_flavor(flavor_manager, FLAVOR_KB_PROXY, proxy_flavor, extra_specs)
                create_flavor(flavor_manager, FLAVOR_KB_CLIENT, flavor_dict, extra_specs)
            else:
                create_flavor(flavor_manager, FLAVOR_KB_SERVER, flavor_dict, extra_specs)

    def delete_resources(self):

        if not self.reusing_tenants:
            for fn, flavor in self.flavors.iteritems():
                LOG.info('Deleting flavor %s', fn)
                try:
                    flavor.delete()
                except Exception as exc:
                    LOG.warning('Error deleting flavor %s: %s', fn, str(exc))

        flag = True
        for tnt in self.tenant_list:
            flag = flag & tnt.delete_resources()

        return flag

    def get_first_network(self):
        if self.tenant_list:
            return self.tenant_list[0].get_first_network()
        return None

    def get_all_instances(self, include_kb_proxy=False):
        all_instances = []
        for tnt in self.tenant_list:
            all_instances.extend(tnt.get_all_instances())
        if (not include_kb_proxy) and all_instances[-1].vm_name == 'KB-PROXY':
            all_instances.pop()

        return all_instances

    def attach_to_shared_net(self, shared_net):
        # If a shared network exists create a port on this
        # network and attach to router interface
        for tnt in self.tenant_list:
            for usr in tnt.user_list:
                for rtr in usr.router_list:
                    rtr.shared_network = shared_net
                    rtr.attach_router_interface(shared_net, use_port=True)
                    for net in rtr.network_list:
                        for ins in net.instance_list:
                            ins.shared_interface_ip = rtr.shared_interface_ip

    def get_az(self):
        '''Placement algorithm for all VMs created in this kloud
        Return None if placement to be provided by the nova scheduler
        Else return an availability zone to use (e.g. "nova")
        or a compute host to use (e.g. "nova:tme123")
        '''
        return self.placement_az

    def create_vm(self, instance):
        LOG.info("Creating Instance: " + instance.vm_name)
        instance.create_server(**instance.boot_info)
        if not instance.instance:
            raise KBVMCreationException(
                'Instance %s takes too long to become ACTIVE.' % instance.vm_name)

        if instance.vol:
            instance.attach_vol()

        instance.fixed_ip = instance.instance.networks.values()[0][0]
        u_fip = instance.config['use_floatingip']
        if instance.vm_name == "KB-PROXY" and not u_fip and not self.multicast_mode:
            neutron_client = instance.network.router.user.neutron_client
            external_network = base_network.find_external_network(neutron_client)
            instance.fip = base_network.create_floating_ip(neutron_client, external_network)
            instance.fip_ip = instance.fip['floatingip']['floating_ip_address']
            self.res_logger.log('floating_ips',
                                instance.fip['floatingip']['floating_ip_address'],
                                instance.fip['floatingip']['id'])

        if instance.fip:
            # Associate the floating ip with this instance
            instance.instance.add_floating_ip(instance.fip_ip)
            instance.ssh_ip = instance.fip_ip
        else:
            # Store the fixed ip as ssh ip since there is no floating ip
            instance.ssh_ip = instance.fixed_ip

        if not instance.vm_name == "KB-PROXY" and self.multicast_mode:
            nc = instance.network.router.user.neutron_client
            base_network.disable_port_security(nc, instance.fixed_ip)

    def create_vms(self, vm_creation_concurrency):
        try:
            with ThreadPoolExecutor(max_workers=vm_creation_concurrency) as executor:
                for feature in executor.map(self.create_vm, self.get_all_instances()):
                    self.vm_up_count += 1
        except Exception:
            self.exc_info = sys.exc_info()


class KloudBuster(object):
    """
    Creates resources on the cloud for loading up the cloud
    1. Tenants
    2. Users per tenant
    3. Routers per user
    4. Networks per router
    5. Instances per network
    """

    def __init__(self, server_cred, client_cred, server_cfg, client_cfg,
                 topology, tenants_list, storage_mode=False, multicast_mode=False,
                 interactive=False, tsdb_connector=None):
        # List of tenant objects to keep track of all tenants
        self.server_cred = server_cred
        self.client_cred = client_cred
        self.server_cfg = server_cfg
        self.client_cfg = client_cfg
        self.storage_mode = storage_mode
        self.multicast_mode = multicast_mode
        self.interactive = interactive
        self.tsdb_connector = tsdb_connector

        if topology and tenants_list:
            self.topology = None
            LOG.warning("REUSING MODE: Topology configs will be ignored.")
        else:
            self.topology = topology
        if tenants_list:
            self.tenants_list = {}
            self.tenants_list['server'] = \
                [{'name': tenants_list['tenant_name'], 'user': tenants_list['server_user']}]
            self.tenants_list['client'] = \
                [{'name': tenants_list['tenant_name'], 'user': tenants_list['client_user']}]
            LOG.warning("REUSING MODE: The quotas will not be adjusted automatically.")
            LOG.warning("REUSING MODE: The flavor configs will be ignored.")
        else:
            self.tenants_list = {'server': None, 'client': None}
        # TODO(check on same auth_url instead)
        self.single_cloud = False if client_cred else True
        if not client_cred:
            self.client_cred = server_cred
        # Automatically enable the floating IP for server cloud under dual-cloud mode
        if not self.single_cloud and not self.server_cfg['use_floatingip']:
            self.server_cfg['use_floatingip'] = True
            LOG.info('Automatically setting "use_floatingip" to True for server cloud...')

        self.kb_proxy = None
        self.final_result = {}
        self.server_vm_create_thread = None
        self.client_vm_create_thread = None
        self.kb_runner = None
        self.fp_logfile = None
        self.kloud = None
        self.testing_kloud = None
        self.server_vm_img = None
        self.client_vm_img = None

    def get_hypervisor_list(self, cred):
        ret_list = []
        sess = cred.get_session()
        nova_client = novaclient('2', endpoint_type='publicURL',
                                 http_log_debug=True, session=sess)
        for hypervisor in nova_client.hypervisors.list():
            if vars(hypervisor)['status'] == 'enabled':
                ret_list.append(vars(hypervisor)['hypervisor_hostname'])

        return ret_list

    def get_az_list(self, cred):
        ret_list = []
        sess = cred.get_session()
        nova_client = novaclient('2', endpoint_type='publicURL',
                                 http_log_debug=True, session=sess)
        for az in nova_client.availability_zones.list():
            zoneName = vars(az)['zoneName']
            isAvail = vars(az)['zoneState']['available']
            if zoneName != 'internal' and isAvail:
                ret_list.append(zoneName)

        return ret_list

    def check_and_upload_image(self, kloud_name, image_name, image_url, sess, retry_count):
        '''Check a VM image and upload it if not found
        '''
        glance_client = glanceclient.Client('2', session=sess)
        try:
            # Search for the image
            img = glance_client.images.list(filters={'name': image_name}).next()
            # image found
            return img
        except StopIteration:
            sys.exc_clear()

        # Trying to upload image
        LOG.info("KloudBuster VM Image is not found in %s, trying to upload it..." % kloud_name)
        if not image_url:
            LOG.error('Configuration file is missing a VM image pathname (vm_image_name)')
            return None
        retry = 0
        try:
            LOG.info("Uploading VM Image from %s..." % image_url)
            with open(image_url) as f_image:
                img = glance_client.images.create(name=image_name,
                                                  disk_format="qcow2",
                                                  container_format="bare",
                                                  visibility="public")
                glance_client.images.upload(img.id, image_data=f_image)
            # Check for the image in glance
            while img.status in ['queued', 'saving'] and retry < retry_count:
                img = glance_client.images.get(img.id)
                retry += 1
                LOG.debug("Image not yet active, retrying %s of %s...", retry, retry_count)
                time.sleep(2)
            if img.status != 'active':
                LOG.error("Image uploaded but too long to get to active state")
                raise Exception("Image update active state timeout")
        except glance_exception.HTTPForbidden:
            LOG.error("Cannot upload image without admin access. Please make "
                      "sure the image is uploaded and is either public or owned by you.")
            return None
        except IOError as exc:
            # catch the exception for file based errors.
            LOG.error("Failed while uploading the image. Please make sure the "
                      "image at the specified location %s is correct: %s",
                      image_url, str(exc))
            return None
        except keystoneauth1.exceptions.http.NotFound as exc:
            LOG.error("Authentication error while uploading the image: " + str(exc))
            return None
        except Exception:
            LOG.error(traceback.format_exc())
            LOG.error("Failed while uploading the image: %s", str(exc))
            return None
        return img

    def check_and_upload_images(self, retry_count=150):
        image_name = self.client_cfg.image_name
        image_url = self.client_cfg.vm_image_file
        self.server_vm_img = self.check_and_upload_image('Server kloud',
                                                         image_name,
                                                         image_url,
                                                         self.server_cred.get_session(),
                                                         retry_count)
        if self.server_vm_img is None:
            return False
        if self.client_cred == self.server_cred:
            self.client_vm_img = self.server_vm_img
        else:
            self.client_vm_img = self.check_and_upload_image('Client kloud',
                                                             image_name,
                                                             image_url,
                                                             self.client_cred.get_session(),
                                                             retry_count)
        return self.client_vm_img is not None

    def print_provision_info(self):
        """
        Function that iterates and prints all VM info
        for tested and testing cloud
        """
        if not self.storage_mode:
            table = [["VM Name", "Host", "Internal IP", "Floating IP", "Subnet",
                      "Shared Interface IP"]]
            client_list = self.kloud.get_all_instances()
            for instance in client_list:
                row = [instance.vm_name, instance.host, instance.fixed_ip,
                       instance.fip_ip, instance.subnet_ip, instance.shared_interface_ip]
                table.append(row)
            LOG.info('Provision Details (Tested Kloud)\n' +
                     tabulate(table, headers="firstrow", tablefmt="psql"))

        table = [["VM Name", "Host", "Internal IP", "Floating IP", "Subnet"]]
        client_list = self.testing_kloud.get_all_instances(include_kb_proxy=True)
        for instance in client_list:
            row = [instance.vm_name, instance.host, instance.fixed_ip,
                   instance.fip_ip, instance.subnet_ip]
            table.append(row)
        LOG.info('Provision Details (Testing Kloud)\n' +
                 tabulate(table, headers="firstrow", tablefmt="psql"))

    def gen_server_user_data(self, test_mode):
        LOG.info("Preparing metadata for VMs... (Server)")
        server_list = self.kloud.get_all_instances()
        idx = 0
        KBScheduler.setup_vm_placement('Server', server_list, self.topology,
                                       self.kloud.placement_az, "Round-robin")
        if test_mode == 'http':
            for ins in server_list:
                ins.user_data['role'] = 'HTTP_Server'
                ins.user_data['http_server_configs'] = ins.config['http_server_configs']
                ins.boot_info['flavor_type'] = FLAVOR_KB_SERVER
                ins.boot_info['user_data'] = str(ins.user_data)
        elif test_mode == 'multicast':
            # Nuttcp tests over first /25
            # Multicast Listeners over second /25
            mc_ad_st = self.client_cfg['multicast_tool_configs']['multicast_address_start']
            listener_addr_start = mc_ad_st.split(".")
            listener_addr_start[-1] = "128"
            naddrs = self.client_cfg['multicast_tool_configs']['addresses'][-1]
            clocks = " ".join(self.client_cfg['multicast_tool_configs']['ntp_clocks'])
            nports = self.client_cfg['multicast_tool_configs']['ports'][-1]
            cfgs = self.client_cfg['multicast_tool_configs']
            listener_addr_start = ".".join(listener_addr_start)
            for ins in server_list:
                ins.user_data['role'] = 'Multicast_Server'
                ins.user_data['n_id'] = idx
                idx += 1
                ins.user_data['multicast_server_configs'] = cfgs
                ins.user_data['multicast_addresses'] = naddrs
                ins.user_data['multicast_ports'] = nports
                ins.user_data['multicast_start_address'] = mc_ad_st
                ins.user_data['multicast_listener_address_start'] = listener_addr_start
                ins.user_data['ntp_clocks'] = clocks
                ins.user_data['pktsizes'] = self.client_cfg.multicast_tool_configs.pktsizes
                ins.boot_info['flavor_type'] = FLAVOR_KB_SERVER
                ins.boot_info['user_data'] = str(ins.user_data)

    def gen_client_user_data(self, test_mode):
        LOG.info("Preparing metadata for VMs... (Client)")
        client_list = self.testing_kloud.get_all_instances()
        KBScheduler.setup_vm_placement('Client', client_list, self.topology,
                                       self.testing_kloud.placement_az, "Round-robin")
        if test_mode != 'storage':
            role = 'HTTP_Client' if test_mode == 'http' else 'Multicast_Client'
            algo = '1:1' if test_mode == 'http' else '1:n'
            server_list = self.kloud.get_all_instances()
            clocks = " ".join(self.client_cfg['multicast_tool_configs']['ntp_clocks'])
            KBScheduler.setup_vm_mappings(client_list, server_list, algo)
            for idx, ins in enumerate(client_list):
                ins.user_data['role'] = role
                ins.user_data['vm_name'] = ins.vm_name
                ins.user_data['redis_server'] = self.kb_proxy.fixed_ip
                ins.user_data['redis_server_port'] = 6379
                ins.user_data['target_subnet_ip'] = server_list[idx].subnet_ip
                ins.user_data['target_shared_interface_ip'] = server_list[idx].shared_interface_ip
                if role == 'Multicast_Client':
                    ins.user_data['ntp_clocks'] = clocks
                ins.boot_info['flavor_type'] = FLAVOR_KB_CLIENT
                ins.boot_info['user_data'] = str(ins.user_data)
        else:
            for idx, ins in enumerate(client_list):
                ins.user_data['role'] = 'Storage_Client'
                ins.user_data['vm_name'] = ins.vm_name
                ins.user_data['redis_server'] = self.kb_proxy.fixed_ip
                ins.user_data['redis_server_port'] = 6379
                ins.boot_info['flavor_type'] = FLAVOR_KB_CLIENT
                ins.boot_info['user_data'] = str(ins.user_data)

    def gen_metadata(self):
        self.final_result = {}
        self.final_result['time'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.final_result['test_mode'] = 'storage' if self.storage_mode else 'http'
        if self.storage_mode:
            self.final_result['storage_target'] = self.client_cfg.storage_stage_configs.target
        if self.multicast_mode:
            self.final_result['test_mode'] = 'multicast'
        self.final_result['version'] = __version__
        self.final_result['kb_result'] = []

    def run(self):
        try:
            self.stage()
            self.run_test()
        except KBException as e:
            LOG.error(e.message)
        except base_network.KBGetProvNetException:
            pass
        except Exception:
            traceback.print_exc()
        except KeyboardInterrupt:
            LOG.info('Terminating KloudBuster...')
        finally:
            if self.server_cfg['cleanup_resources'] and self.client_cfg['cleanup_resources']:
                self.cleanup()

    def stage(self):
        """
        Staging all resources for running KloudBuster Tests
        """
        vm_creation_concurrency = self.client_cfg.vm_creation_concurrency
        tenant_quota = self.calc_tenant_quota()
        if not self.storage_mode:
            self.kloud = Kloud(self.server_cfg, self.server_cred, self.tenants_list['server'],
                               self.server_vm_img,
                               storage_mode=self.storage_mode, multicast_mode=self.multicast_mode)
            self.server_vm_create_thread = threading.Thread(target=self.kloud.create_vms,
                                                            args=[vm_creation_concurrency])
            self.server_vm_create_thread.daemon = True
        self.testing_kloud = Kloud(self.client_cfg, self.client_cred,
                                   self.tenants_list['client'],
                                   self.client_vm_img,
                                   testing_side=True,
                                   storage_mode=self.storage_mode,
                                   multicast_mode=self.multicast_mode)
        self.client_vm_create_thread = threading.Thread(target=self.testing_kloud.create_vms,
                                                        args=[vm_creation_concurrency])
        self.client_vm_create_thread.daemon = True

        if not self.storage_mode:
            self.kloud.create_resources(tenant_quota['server'])
        self.testing_kloud.create_resources(tenant_quota['client'])

        # Setting up the KloudBuster Proxy node
        client_list = self.testing_kloud.get_all_instances()
        self.kb_proxy = client_list[-1]
        client_list.pop()

        self.kb_proxy.vm_name = 'KB-PROXY'
        self.kb_proxy.user_data['role'] = 'KB-PROXY'
        self.kb_proxy.boot_info['flavor_type'] = FLAVOR_KB_PROXY
        if self.topology:
            proxy_hyper = self.topology.clients_rack[0]
            self.kb_proxy.boot_info['avail_zone'] = \
                "%s:%s" % (self.testing_kloud.placement_az, proxy_hyper) \
                if self.testing_kloud.placement_az else "nova:%s" % (proxy_hyper)

        self.kb_proxy.boot_info['user_data'] = str(self.kb_proxy.user_data)
        self.testing_kloud.create_vm(self.kb_proxy)
        if self.storage_mode:
            self.kb_runner = KBRunner_Storage(client_list, self.client_cfg)
        elif self.multicast_mode:
            self.kb_runner = KBRunner_Multicast(client_list, self.client_cfg,
                                                self.single_cloud)

        else:
            self.kb_runner = KBRunner_HTTP(client_list, self.client_cfg,
                                           self.single_cloud)

        self.kb_runner.setup_redis(self.kb_proxy.fip_ip or self.kb_proxy.fixed_ip)
        if self.client_cfg.progression['enabled'] and not self.multicast_mode:
            log_info = "Progression run is enabled, KloudBuster will schedule " \
                       "multiple runs as listed:"
            stage = 1
            start = self.client_cfg.progression.vm_start
            multiple = self.client_cfg.progression.vm_multiple
            cur_vm_count = 1 if start else multiple
            # Minus 1 for KB-Proxy
            total_vm = self.get_tenant_vm_count(self.client_cfg) - 1
            while (cur_vm_count <= total_vm):
                log_info += "\n" + self.kb_runner.header_formatter(stage, cur_vm_count)
                cur_vm_count = (stage + 1 - start) * multiple
                stage += 1
            LOG.info(log_info)

        if self.single_cloud and not self.storage_mode and not self.multicast_mode:
            # Find the shared network if the cloud used to testing is same
            # Attach the router in tested kloud to the shared network
            shared_net = self.testing_kloud.get_first_network()
            self.kloud.attach_to_shared_net(shared_net)

        # Create VMs in both tested and testing kloud concurrently
        user_data_mode = "multicast" if self.multicast_mode else "http"
        if self.storage_mode:
            self.gen_client_user_data("storage")
            self.client_vm_create_thread.start()
            self.client_vm_create_thread.join()
        elif self.single_cloud:
            self.gen_server_user_data(user_data_mode)
            self.server_vm_create_thread.start()
            self.server_vm_create_thread.join()
            self.gen_client_user_data(user_data_mode)
            self.client_vm_create_thread.start()
            self.client_vm_create_thread.join()
        else:
            self.gen_server_user_data(user_data_mode)
            self.gen_client_user_data(user_data_mode)
            self.server_vm_create_thread.start()
            self.client_vm_create_thread.start()
            self.server_vm_create_thread.join()
            self.client_vm_create_thread.join()

        if self.testing_kloud and self.testing_kloud.exc_info:
            raise self.testing_kloud.exc_info[1], None, self.testing_kloud.exc_info[2]

        if self.kloud and self.kloud.exc_info:
            raise self.kloud.exc_info[1], None, self.kloud.exc_info[2]

        # Function that print all the provisioning info
        self.print_provision_info()

    def run_test(self, test_only=False):
        start_time = time.time()
        runlabel = None
        self.gen_metadata()
        self.kb_runner.config = self.client_cfg
        if not test_only:
            # Resources are already staged, just re-run the storage benchmarking tool
            self.kb_runner.wait_for_vm_up()
        # Run the runner to perform benchmarkings
        while 1:
            if self.interactive:
                print()
                runlabel = raw_input('>> KB ready, enter label for next run or "q" to quit: ')
                if runlabel.lower() == "q":
                    break

            for run_result in self.kb_runner.run(test_only, runlabel):
                if not self.multicast_mode or len(self.final_result['kb_result']) == 0:
                    self.final_result['kb_result'].append(self.kb_runner.tool_result)
            tsdb_result = self.tsdb_connector.get_results(start_time=start_time)
            if tsdb_result:
                self.final_result['tsdb'] = tsdb_result
            LOG.info('SUMMARY: %s' % self.final_result)
            if not self.interactive:
                break

    def stop_test(self):
        self.kb_runner.stop()
        LOG.info('Testing is stopped by request.')

    def cleanup(self):
        # Stop the runner, shutdown the redis thread
        if self.kb_runner:
            try:
                self.kb_runner.dispose()
            except Exception:
                pass

        # Cleanup: start with tested side first
        # then testing side last (order is important because of the shared network)
        cleanup_flag = False
        try:
            cleanup_flag = self.kloud.delete_resources() if not self.storage_mode else True
        except Exception:
            traceback.print_exc()
        if not cleanup_flag:
            LOG.warning('Some resources in server cloud are not cleaned up properly.')
            KBResLogger.dump_and_save('svr', self.kloud.res_logger.resource_list)

        cleanup_flag = False
        try:
            if self.testing_kloud:
                cleanup_flag = self.testing_kloud.delete_resources()
        except Exception:
            traceback.print_exc()
        if not cleanup_flag:
            LOG.warning('Some resources in client cloud are not cleaned up properly.')
            KBResLogger.dump_and_save('clt', self.testing_kloud.res_logger.resource_list)

        # Set the kloud to None
        self.kloud = None
        self.testing_kloud = None

    def dump_logs(self, offset=0):
        if not self.fp_logfile:
            return ""

        self.fp_logfile.seek(offset)
        return self.fp_logfile.read()

    def dispose(self):
        if self.fp_logfile:
            self.fp_logfile.close()
        logging.delete_logfile('kloudbuster', self.fp_logfile.name)
        self.fp_logfile = None

    def get_tenant_vm_count(self, config):
        # this does not apply for storage mode!
        return (config['routers_per_tenant'] * config['networks_per_router'] *
                config['vms_per_network'])

    def calc_neutron_quota(self):
        total_vm = self.get_tenant_vm_count(self.server_cfg)

        server_quota = {}
        server_quota['network'] = self.server_cfg['routers_per_tenant'] * \
            self.server_cfg['networks_per_router']
        server_quota['subnet'] = server_quota['network']
        server_quota['router'] = self.server_cfg['routers_per_tenant']
        if (self.server_cfg['use_floatingip']):
            # (1) Each VM has one floating IP
            # (2) Each Router has one external IP
            server_quota['floatingip'] = total_vm + server_quota['router']
            # (1) Each VM Floating IP takes up 1 port, total of $total_vm port(s)
            # (2) Each VM Fixed IP takes up 1 port, total of $total_vm port(s)
            # (3) Each Network has one router_interface (gateway), and one DHCP agent, total of
            #     server_quota['network'] * 2 port(s)
            # (4) Each Router has one external IP, takes up 1 port, total of
            #     server_quota['router'] port(s)
            server_quota['port'] = 2 * total_vm + 2 * server_quota['network'] + \
                server_quota['router'] + 10
        else:
            server_quota['floatingip'] = server_quota['router']
            server_quota['port'] = total_vm + 2 * server_quota['network'] + \
                server_quota['router'] + 10
        server_quota['security_group'] = server_quota['network'] + 1
        server_quota['security_group_rule'] = server_quota['security_group'] * 10

        client_quota = {}
        total_vm = self.get_tenant_vm_count(self.client_cfg)
        client_quota['network'] = 1
        client_quota['subnet'] = 1
        client_quota['router'] = 1
        if (self.client_cfg['use_floatingip']):
            # (1) Each VM has one floating IP
            # (2) Each Router has one external IP, total of 1 router
            # (3) KB-Proxy node has one floating IP
            client_quota['floatingip'] = total_vm + 1 + 1
            # (1) Each VM Floating IP takes up 1 port, total of $total_vm port(s)
            # (2) Each VM Fixed IP takes up 1 port, total of $total_vm port(s)
            # (3) Each Network has one router_interface (gateway), and one DHCP agent, total of
            #     client_quota['network'] * 2 port(s)
            # (4) KB-Proxy node takes up 2 ports, one for fixed IP, one for floating IP
            # (5) Each Router has one external IP, takes up 1 port, total of 1 router/port
            client_quota['port'] = 2 * total_vm + 2 * client_quota['network'] + 2 + 1 + 10
        else:
            client_quota['floatingip'] = 1 + 1
            client_quota['port'] = total_vm + 2 * client_quota['network'] + 2 + 1
        if self.single_cloud:
            # Under single-cloud mode, the shared network is attached to every router in server
            # cloud, and each one takes up 1 port on client side.
            client_quota['port'] = client_quota['port'] + server_quota['router'] + 10
        client_quota['security_group'] = client_quota['network'] + 1
        client_quota['security_group_rule'] = client_quota['security_group'] * 10

        return [server_quota, client_quota]

    def calc_nova_quota(self):
        server_quota = {}
        client_quota = {}
        if self.storage_mode:
            # in case of storage, the number of VMs is to be taken from the
            # the storage config
            total_vm = self.client_cfg['storage_stage_configs']['vm_count']
        else:
            total_vm = self.get_tenant_vm_count(self.server_cfg)
            server_quota['instances'] = total_vm
            server_quota['cores'] = total_vm * self.server_cfg['flavor']['vcpus']
            server_quota['ram'] = total_vm * self.server_cfg['flavor']['ram']
            LOG.info('Server tenant Nova quotas: instances=%d vcpus=%d ram=%dMB',
                     server_quota['instances'],
                     server_quota['cores'],
                     server_quota['ram'])
            total_vm = self.get_tenant_vm_count(self.client_cfg)

        # add 1 for the proxy
        client_quota['instances'] = total_vm + 1
        client_quota['cores'] = total_vm * self.client_cfg['flavor']['vcpus'] + 1
        client_quota['ram'] = total_vm * self.client_cfg['flavor']['ram'] + 2048
        LOG.info('Client tenant Nova quotas: instances=%d vcpus=%d ram=%dMB',
                 client_quota['instances'],
                 client_quota['cores'],
                 client_quota['ram'])
        return [server_quota, client_quota]

    def calc_cinder_quota(self):
        # Cinder quotas are only set for storage mode
        # Since storage mode only uses client tenant
        # Server tenant cinder quota is only used for non-storage case
        # we can leave the server quota empty
        server_quota = {}

        # Client tenant quota is based on the number of
        # storage VMs and disk size per VM
        # (note this is not the flavor disk size!)
        client_quota = {}
        if self.storage_mode:
            storage_cfg = self.client_cfg['storage_stage_configs']
            vm_count = storage_cfg['vm_count']
            client_quota['gigabytes'] = vm_count * storage_cfg['disk_size']
            client_quota['volumes'] = vm_count
            LOG.info('Cinder quotas: volumes=%d storage=%dGB', vm_count, client_quota['gigabytes'])
        return [server_quota, client_quota]

    def calc_tenant_quota(self):
        quota_dict = {'server': {}, 'client': {}}
        nova_quota = self.calc_nova_quota()
        neutron_quota = self.calc_neutron_quota()
        cinder_quota = self.calc_cinder_quota()
        for idx, val in enumerate(['server', 'client']):
            quota_dict[val]['nova'] = nova_quota[idx]
            quota_dict[val]['neutron'] = neutron_quota[idx]
            quota_dict[val]['cinder'] = cinder_quota[idx]

        return quota_dict


def create_html(hfp, template, task_re, is_config):
    for line in template:
        line = line.replace('[[result]]', task_re)
        if is_config:
            line = line.replace('[[is_config]]', 'true')
            line = line.replace('[[config]]', json.dumps(is_config, sort_keys=True))
        else:
            line = line.replace('[[is_config]]', 'false')
        if CONF.label:
            line = line.replace('[[label]]', CONF.label)
        else:
            line = line.replace('[[label]]', 'Storage Scale Report')
        hfp.write(line)
    if not CONF.headless:
        # bring up the file in the default browser
        url = 'file://' + os.path.abspath(CONF.html)
        webbrowser.open(url, new=2)


def generate_charts(json_results, html_file_name, is_config):
    '''Save results in HTML format file.'''
    LOG.info('Saving results to HTML file: ' + html_file_name + '...')
    try:
        if json_results['test_mode'] == "storage":
            template_path = resource_filename(__name__, 'template_storage.html')
        elif json_results['test_mode'] == "http":
            template_path = resource_filename(__name__, 'template_http.html')
        else:
            raise
    except Exception:
        LOG.error('Invalid json file.')
        sys.exit(1)
    with open(html_file_name, 'w') as hfp, open(template_path, 'r') as template:
        create_html(hfp,
                    template,
                    json.dumps(json_results, sort_keys=True),
                    is_config)


def main():
    cli_opts = [
        cfg.StrOpt("config",
                   short="c",
                   default=None,
                   help="Override default values with a config file",
                   metavar="<config file>"),
        cfg.BoolOpt("storage",
                    default=False,
                    help="Running KloudBuster to test storage performance"),
        cfg.BoolOpt("multicast",
                    default=False,
                    help="Running KloudBuster to test multicast performance"),
        cfg.StrOpt("topology",
                   short="t",
                   default=None,
                   help="Topology file for compute hosts",
                   metavar="<topology file>"),
        cfg.StrOpt("tenants-list",
                   short="l",
                   default=None,
                   help="Existing tenant and user lists for reusing",
                   metavar="<tenants file>"),
        cfg.StrOpt("rc",
                   default=None,
                   help="Tested cloud openrc credentials file (same as --tested-rc)",
                   metavar="<rc file>"),
        cfg.StrOpt("tested-rc",
                   default=None,
                   help="Tested cloud openrc credentials file",
                   metavar="<rc file>"),
        cfg.StrOpt("testing-rc",
                   default=None,
                   help="Testing cloud openrc credentials file",
                   metavar="<rc file>"),
        cfg.StrOpt("passwd",
                   default=None,
                   secret=True,
                   help="Tested cloud password (same as --tested-pwd)",
                   metavar="<password>"),
        cfg.StrOpt("tested-passwd",
                   default=None,
                   secret=True,
                   help="Tested cloud password",
                   metavar="<password>"),
        cfg.StrOpt("testing-passwd",
                   default=None,
                   secret=True,
                   help="Testing cloud password",
                   metavar="<password>"),
        cfg.BoolOpt("interactive",
                    default=False,
                    help="Running KloudBuster in interactive mode"),
        cfg.StrOpt("html",
                   default=None,
                   help='store results in HTML file',
                   metavar="<dest html file>"),
        cfg.StrOpt("label",
                   default=None,
                   help='label for the title in HTML file',
                   metavar="<title>"),
        cfg.BoolOpt("headless",
                    default=False,
                    help="do not show chart in the browser (default=False, only used if --html)"),
        cfg.StrOpt("json",
                   default=None,
                   help='store results in JSON format file',
                   metavar="<dest json file>"),
        cfg.StrOpt("csv",
                   default=None,
                   help='store results in CSV format, multicast only.',
                   metavar="<csv file>"),
        cfg.BoolOpt("no-env",
                    default=False,
                    help="Do not read env variables"),
        cfg.BoolOpt("show-config",
                    default=False,
                    help="Show the default configuration"),
        cfg.StrOpt("charts-from-json",
                   default=None,
                   help='create charts from json results and exit (requires --html)',
                   metavar="<source json file>"),
    ]
    CONF.register_cli_opts(cli_opts)
    CONF(sys.argv[1:], project="kloudbuster", version=__version__)
    logging.setup("kloudbuster")

    if CONF.rc and not CONF.tested_rc:
        CONF.tested_rc = CONF.rc

    if CONF.passwd and not CONF.tested_passwd:
        CONF.tested_passwd = CONF.passwd

    if CONF.charts_from_json:
        if not CONF.html:
            LOG.error('Destination html filename must be specified using --html.')
            sys.exit(1)
        with open(CONF.charts_from_json, 'r') as jfp:
            json_results = json.load(jfp)
        generate_charts(json_results, CONF.html, None)
        sys.exit(0)

    if CONF.show_config:
        print resource_string(__name__, "cfg.scale.yaml")
        sys.exit(0)

    if CONF.multicast and CONF.storage:
        LOG.error('--multicast and --storage can not both be chosen.')
        sys.exit(1)

    try:
        kb_config = KBConfig()
        kb_config.init_with_cli()
    except TypeError:
        LOG.exception('Error parsing the configuration file')
        sys.exit(1)

    # The KloudBuster class is just a wrapper class
    # levarages tenant and user class for resource creations and deletion
    tsdb_module = importlib.import_module(kb_config.tsdb_module)
    tsdb_connector = getattr(tsdb_module, kb_config.tsdb_class)(
        config=kb_config.tsdb)
    kloudbuster = KloudBuster(
        kb_config.cred_tested, kb_config.cred_testing,
        kb_config.server_cfg, kb_config.client_cfg,
        kb_config.topo_cfg, kb_config.tenants_list,
        storage_mode=CONF.storage, multicast_mode=CONF.multicast,
        interactive=CONF.interactive, tsdb_connector=tsdb_connector)
    if kloudbuster.check_and_upload_images():
        kloudbuster.run()

    if CONF.json:
        '''Save results in JSON format file.'''
        LOG.info('Saving results in json file: ' + CONF.json + "...")
        with open(CONF.json, 'w') as jfp:
            json.dump(kloudbuster.final_result, jfp, indent=4, sort_keys=True)

    if CONF.multicast and CONF.csv and 'kb_result' in kloudbuster.final_result:
        '''Save results in JSON format file.'''
        if len(kloudbuster.final_result['kb_result']) > 0:
            LOG.info('Saving results in csv file: ' + CONF.csv + "...")
            with open(CONF.csv, 'w') as jfp:
                jfp.write(KBRunner_Multicast.json_to_csv(kloudbuster.final_result['kb_result'][0]))

    if CONF.html:
        generate_charts(kloudbuster.final_result, CONF.html, kb_config.config_scale)


if __name__ == '__main__':
    main()
