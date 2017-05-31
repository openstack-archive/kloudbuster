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

import time

from perf_instance import PerfInstance

import base_compute
import base_storage
import log as logging
import netaddr
from neutronclient.common.exceptions import NetworkInUseClient

LOG = logging.getLogger(__name__)

# Global CIDR shared by all objects of this class
# Enables each network to get a unique CIDR
START_CIDR = "10.0.0.0/16"
cidr = START_CIDR

class KBGetExtNetException(Exception):
    pass

class KBGetProvNetException(Exception):
    pass

def create_floating_ip(neutron_client, ext_net):
    """
    Function that creates a floating ip and returns it
    Accepts the neutron client and ext_net

    Module level function since this is not associated with a
    specific network instance
    """
    body = {
        "floatingip": {
            "floating_network_id": ext_net['id']
        }
    }
    fip = neutron_client.create_floatingip(body)
    return fip

def disable_port_security(neutron_client, ip):
    ports = neutron_client.list_ports()
    for p in ports['ports']:
        if p['fixed_ips'][0]['ip_address'] == ip:
            body = {"port": {"security_groups": [], "port_security_enabled": False}}
            neutron_client.update_port(p['id'], body)

def delete_floating_ip(neutron_client, fip):
    """
    Deletes the floating ip
    Module level function since this operation
    is not associated with a network

    Sometimes this will fail if instance is just deleted
    Add a retry mechanism
    """
    for _ in range(10):
        try:
            neutron_client.delete_floatingip(fip)
            return True
        except Exception:
            time.sleep(1)

    LOG.error('Failed while deleting floating IP %s.' % fip)
    return False

def find_external_network(neutron_client):
    """
    Find the external network
    and return it
    If no external network is found return None
    """
    networks = neutron_client.list_networks()['networks']
    for network in networks:
        if network['router:external']:
            return network

    LOG.error("No external network is found.")
    raise KBGetExtNetException()

def find_provider_network(neutron_client, name):
    """
    Find the external network
    and return it
    If no external network is found return None
    """
    networks = neutron_client.list_networks()['networks']
    for network in networks:
        if network['provider:physical_network']:
            if name == "" or name == network['name']:
                return network
    if name != "":
        LOG.error("The provider network: " + name + " was not found.")
    else:
        LOG.error("No provider network is found.")
    raise KBGetProvNetException()

def find_first_network(neutron_client):
    """
    Find the external network
    and return it
    If no external network is found return None
    """
    networks = neutron_client.list_networks()['networks']
    if (len(networks) > 0):
        return networks[0]
    return None

class BaseNetwork(object):
    """
    The Base class for neutron network operations
    1. Creates networks with 1 subnet inside each network
    2. Increments a global CIDR for all network instances
    3. Deletes all networks on completion
    4. Also interacts with the compute class for instances
    """

    def __init__(self, router):
        """
        Store the neutron client
        User name for this network
        and network object
        """
        self.neutron_client = router.user.neutron_client
        self.nova_client = router.user.nova_client
        self.cinder_client = router.user.cinder_client
        self.router = router
        self.res_logger = router.res_logger
        self.network = None
        self.instance_list = []
        self.secgroup_list = []

    def create_compute_resources(self, network_prefix, config_scale):
        """
        Creates the compute resources includes the following resources
        1. VM instances
        2. Security groups
        3. Keypairs
        """
        # Create the security groups first
        for secgroup_count in range(config_scale['secgroups_per_network']):
            secgroup_instance = base_compute.SecGroup(self.nova_client, self.neutron_client)
            self.secgroup_list.append(secgroup_instance)
            secgroup_name = network_prefix + "-SG" + str(secgroup_count)
            secgroup_instance.create_secgroup_with_rules(secgroup_name)
            self.res_logger.log('sec_groups', secgroup_instance.secgroup['name'],
                                secgroup_instance.secgroup['id'])

        LOG.info("Scheduled to create VMs for network %s..." % network_prefix)

        vm_total = config_scale['vms_per_network']
        if config_scale['use_floatingip']:
            external_network = find_external_network(self.neutron_client)

        storage_mode = self.router.user.tenant.kloud.storage_mode
        if storage_mode and config_scale['storage_stage_configs']['target'] == 'volume':
            bs_obj = base_storage.BaseStorage(self.cinder_client)
            vol_size = config_scale['storage_stage_configs']['disk_size']
        else:
            vol_size = 0

        # Schedule to create the required number of VMs
        for instance_count in xrange(vm_total):
            vm_name = network_prefix + "-I" + str(instance_count)
            perf_instance = PerfInstance(vm_name, self, config_scale)
            self.instance_list.append(perf_instance)

            # Create volume if needed
            # Don't create volumn for KB-Proxy
            if vol_size and instance_count < vm_total - 1:
                vol_name = network_prefix + "-V" + str(instance_count)
                perf_instance.vol = bs_obj.create_vol(vol_size, name=vol_name)
                self.res_logger.log('volumes', vol_name, perf_instance.vol.id)

            perf_instance.subnet_ip = self.network['subnet_ip']
            if config_scale['use_floatingip']:
                # Create the floating ip for the instance
                # store it and the ip address in perf_instance object
                perf_instance.fip = create_floating_ip(self.neutron_client, external_network)
                perf_instance.fip_ip = perf_instance.fip['floatingip']['floating_ip_address']
                self.res_logger.log('floating_ips',
                                    perf_instance.fip['floatingip']['floating_ip_address'],
                                    perf_instance.fip['floatingip']['id'])

            # Create the VMs on specified network, first keypair, first secgroup
            perf_instance.boot_info['image_name'] = config_scale['image_name']
            perf_instance.boot_info['keyname'] = self.router.user.key_name
            perf_instance.boot_info['nic'] = [{'net-id': self.network['id']}]
            perf_instance.boot_info['sec_group'] = self.secgroup_list[0].secgroup
            perf_instance.boot_info['avail_zone'] = self.router.user.tenant.kloud.get_az()

    def delete_compute_resources(self):
        """
        Deletes the compute resources
        Security groups, keypairs and instances
        """
        flag = True
        if self.instance_list and self.instance_list[0].vol:
            bs_obj = base_storage.BaseStorage(self.cinder_client)

        # Delete the instances first
        for instance in self.instance_list:
            if instance.vol:
                instance.detach_vol()
                flag = flag & bs_obj.delete_vol(instance.vol)
            instance.delete_server()
            if instance.fip:
                # Delete the Floating IP
                flag = flag &\
                    delete_floating_ip(self.neutron_client, instance.fip['floatingip']['id'])

        # Delete all security groups
        for secgroup_instance in self.secgroup_list:
            flag = flag & secgroup_instance.delete_secgroup()

        return flag

    def create_network_and_subnet(self, network_name):
        """
        Create a network with 1 subnet inside it
        """
        subnet_name = "KB_subnet_" + network_name
        body = {
            'network': {
                'name': network_name,
                'admin_state_up': True
            }
        }
        self.network = self.neutron_client.create_network(body)['network']

        # Now create the subnet inside this network support ipv6 in future
        body = {
            'subnet': {
                'name': subnet_name,
                'cidr': self.generate_cidr(),
                'network_id': self.network['id'],
                'enable_dhcp': True,
                'ip_version': 4
            }
        }
        subnet = self.neutron_client.create_subnet(body)['subnet']
        # add subnet id to the network dict since it has just been added
        self.network['subnets'] = [subnet['id']]
        self.network['subnet_ip'] = cidr

    def add_provider_network(self, name):
        self.network = find_provider_network(self.neutron_client, name)
        if len(self.network['subnets']) > 0:
            self.network['subnet_ip'] = self.get_cidr_from_subnet_id(self.network['subnets'][0])

    def get_cidr_from_subnet_id(self, subnetID):
        sub = self.neutron_client.show_subnet(subnetID)
        return sub['subnet']['cidr']


    def generate_cidr(self):
        """Generate next CIDR for network or subnet, without IP overlapping.
        """
        global cidr
        cidr = str(netaddr.IPNetwork(cidr).next())
        return cidr

    def delete_network(self):
        """
        Deletes the network and associated subnet
        retry the deletion since network may be in use
        """
        if not self.network:
            return True
        for _ in range(10):
            try:
                self.neutron_client.delete_network(self.network['id'])
                return True
            except NetworkInUseClient:
                time.sleep(1)

        LOG.error('Failed while deleting network %s.' % self.network['id'])
        return False

    def get_all_instances(self):
        return self.instance_list

class Router(object):
    """
    Router class to create a new routers
    Supports addition and deletion
    of network interfaces to router
    """

    def __init__(self, user, is_dumb=False):
        self.neutron_client = user.neutron_client
        self.nova_client = user.nova_client
        self.router = None
        self.user = user
        self.res_logger = user.res_logger
        # Stores the list of networks
        self.network_list = []
        # Store the shared network
        self.shared_network = None
        self.shared_port_id = None
        # Store the interface ip of shared network attached to router
        self.shared_interface_ip = None
        self.is_dumb = is_dumb

    def create_network_resources(self, config_scale):
        """
        Creates the required number of networks per router
        Also triggers the creation of compute resources inside each
        network
        """

        if self.is_dumb:
            network_instance = BaseNetwork(self)
            self.network_list.append(network_instance)
            network_instance.add_provider_network(config_scale['multicast_provider_network_name'])
            network_instance.create_compute_resources(network_instance.network['name'],
                                                      config_scale)
            return

        for network_count in range(config_scale['networks_per_router']):
            network_instance = BaseNetwork(self)
            self.network_list.append(network_instance)
            # Create the network and subnet
            network_name = self.router['router']['name'] + "-N" + str(network_count)
            network_instance.create_network_and_subnet(network_name)
            self.res_logger.log('networks', network_instance.network['name'],
                                network_instance.network['id'])
            # Attach the created network to router interface
            self.attach_router_interface(network_instance)
            # Create the compute resources in the network
            network_instance.create_compute_resources(network_name, config_scale)

    def get_first_network(self):
        if self.network_list:
            return self.network_list[0]
        return None

    def get_all_instances(self):
        all_instances = []
        for network in self.network_list:
            all_instances.extend(network.get_all_instances())
        return all_instances

    def delete_network_resources(self):
        """
        Delete all network and compute resources
        associated with a router
        """

        flag = True
        for network in self.network_list:
            # Now delete the compute resources and the network resources
            flag = flag & network.delete_compute_resources()
            if network.network:
                if self.is_dumb:
                    continue
                flag = flag & self.remove_router_interface(network)
                flag = flag & network.delete_network()
        # Also delete the shared port and remove it from router interface
        if self.shared_network and not self.is_dumb:
            flag = flag & self.remove_router_interface(self.shared_network, use_port=True)
            self.shared_network = None

        return flag

    def create_router(self, router_name, ext_net):
        """
        Create the router and attach it to
        external network
        """
        # Attach an external network if available
        if ext_net:
            body = {
                "router": {
                    "name": router_name,
                    "admin_state_up": True,
                    "external_gateway_info": {
                        "network_id": ext_net['id']
                    }
                }
            }
        else:
            body = {
                "router": {
                    "name": router_name,
                    "admin_state_up": True
                }
            }
        self.router = self.neutron_client.create_router(body)
        return self.router['router']

    def delete_router(self):
        """
        Delete the router
        Also delete the networks attached to this router
        """
        # Delete the network resources first and than delete the router itself
        if not self.router and not self.is_dumb:
            return True
        network_flag = self.delete_network_resources()
        if self.is_dumb:
            return network_flag
        router_flag = False
        for _ in range(10):
            try:
                self.neutron_client.remove_gateway_router(self.router['router']['id'])
                self.neutron_client.delete_router(self.router['router']['id'])
                router_flag = True
                break
            except Exception:
                time.sleep(1)
        if not router_flag:
            LOG.error('Failed while deleting router %s.' % self.router['router']['id'])

        return network_flag & router_flag

    def _port_create_neutron(self, network_instance):
        """
        Creates a port on a specific network
        """
        body = {
            "port": {
                "admin_state_up": True,
                "network_id": network_instance.network['id']
            }
        }
        post_output = self.neutron_client.create_port(body)
        self.shared_interface_ip = post_output['port']['fixed_ips'][0]['ip_address']
        return post_output['port']['id']

    def _port_delete_neutron(self, port):
        self.neutron_client.delete_port(port)

    def attach_router_interface(self, network_instance, use_port=False):
        """
        Attach a network interface to the router
        """
        # If shared port is specified use that
        if use_port:
            self.shared_port_id = self._port_create_neutron(network_instance)
            body = {
                'port_id': self.shared_port_id
            }
        else:
            body = {
                'subnet_id': network_instance.network['subnets'][0]
            }
        self.neutron_client.add_interface_router(self.router['router']['id'], body)

    def remove_router_interface(self, network_instance, use_port=False):
        """
        Remove the network interface from router
        """
        if use_port:
            body = {
                'port_id': self.shared_port_id
            }
        else:
            body = {
                'subnet_id': network_instance.network['subnets'][0]
            }

        for _ in range(10):
            try:
                self.neutron_client.remove_interface_router(self.router['router']['id'], body)
                return True
            except Exception:
                time.sleep(1)

        return False



class NeutronQuota(object):

    def __init__(self, neutronclient, tenant_id):
        self.neutronclient = neutronclient
        self.tenant_id = tenant_id

    def get(self):
        return self.neutronclient.show_quota(self.tenant_id)['quota']

    def update_quota(self, quotas):
        body = {
            'quota': quotas
        }
        self.neutronclient.update_quota(self.tenant_id, body)
