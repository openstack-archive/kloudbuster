# Copyright 2015 Cisco Systems, Inc.  All rights reserved.
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

import os
import time

import log as logging
from novaclient.exceptions import BadRequest

LOG = logging.getLogger(__name__)

class KBVolAttachException(Exception):
    pass


class BaseCompute(object):
    """
    The Base class for nova compute resources
    1. Creates virtual machines with specific configs
    """

    def __init__(self, vm_name, network):
        self.novaclient = network.router.user.nova_client
        self.network = network
        self.res_logger = network.res_logger
        self.vm_name = vm_name
        self.instance = None
        self.host = None
        self.fip = None
        self.fip_ip = None
        self.subnet_ip = None
        self.fixed_ip = None
        self.ssh_ip = None
        # Shared interface ip for tested and testing cloud
        self.shared_interface_ip = None
        self.vol = None


    # Create a server instance with associated
    # security group, keypair with a provided public key
    def create_server(self, image_name, flavor_type, keyname,
                      nic, sec_group, avail_zone=None, user_data=None,
                      config_drive=None, retry_count=100):
        """
        Create a VM instance given following parameters
        1. VM Name
        2. Image Name
        3. Flavor name
        4. key pair name
        5. Security group instance
        6. Optional parameters: availability zone, user data, config drive
        """
        kloud = self.network.router.user.tenant.kloud
        image = kloud.vm_img
        flavor = kloud.flavors[flavor_type]

        # Also attach the created security group for the test
        instance = self.novaclient.servers.create(name=self.vm_name,
                                                  image=image,
                                                  flavor=flavor,
                                                  key_name=keyname,
                                                  nics=nic,
                                                  availability_zone=avail_zone,
                                                  userdata=user_data,
                                                  config_drive=config_drive,
                                                  security_groups=[sec_group['id']])
        self.res_logger.log('instances', self.vm_name, instance.id)

        if not instance:
            return None
        # Verify that the instance gets into the ACTIVE state
        for _ in range(retry_count):
            instance = self.novaclient.servers.get(instance.id)
            if instance.status == 'ACTIVE':
                self.instance = instance
                if 'OS-EXT-SRV-ATTR:hypervisor_hostname' in vars(instance):
                    self.host = vars(instance)['OS-EXT-SRV-ATTR:hypervisor_hostname']
                else:
                    self.host = "Unknown"
                return instance
            if instance.status == 'ERROR':
                LOG.error('Instance creation error:' + instance.fault['message'])
                return None
            time.sleep(2)

    def attach_vol(self):
        if self.vol.status != 'available':
            raise KBVolAttachException('Volume must be in available status before attaching.')
        for _ in range(10):
            try:
                self.novaclient.volumes.create_server_volume(self.instance.id, self.vol.id)
                break
            except Exception:
                time.sleep(1)

    def get_server_list(self):
        servers_list = self.novaclient.servers.list()
        return servers_list

    def delete_server(self):
        # First delete the instance
        if self.instance:
            self.novaclient.servers.delete(self.instance)
            self.instance = None

    def detach_vol(self):
        if self.instance and self.vol:
            attached_vols = self.novaclient.volumes.get_server_volumes(self.instance.id)
            if len(attached_vols):
                try:
                    self.novaclient.volumes.delete_server_volume(self.instance.id, self.vol.id)
                except BadRequest:
                    # WARNING Some resources in client cloud are not cleaned up properly.:
                    # BadRequest: Invalid volume: Volume must be attached in order to detach
                    pass

    def find_flavor(self, flavor_type):
        """
        Given a named flavor return the flavor
        """
        flavor = self.novaclient.flavors.find(name=flavor_type)
        return flavor


class SecGroup(object):

    def __init__(self, novaclient, neutronclient):
        self.secgroup = None
        self.secgroup_name = None
        self.novaclient = novaclient
        self.neutronclient = neutronclient

    def create_secgroup_with_rules(self, group_name):
        body = {
            'security_group': {
                'name': group_name,
                'description': 'Test sec group'
            }
        }
        group = self.neutronclient.create_security_group(body)['security_group']

        body = {
            'security_group_rule': {
                'direction': 'ingress',
                'security_group_id': group['id'],
                'remote_group_id': None
            }
        }

        # Allow ping traffic
        body['security_group_rule']['protocol'] = 'icmp'
        body['security_group_rule']['port_range_min'] = None
        body['security_group_rule']['port_range_max'] = None
        self.neutronclient.create_security_group_rule(body)

        # Allow SSH traffic
        body['security_group_rule']['protocol'] = 'tcp'
        body['security_group_rule']['port_range_min'] = 22
        body['security_group_rule']['port_range_max'] = 22
        self.neutronclient.create_security_group_rule(body)

        # Allow HTTP traffic
        body['security_group_rule']['protocol'] = 'tcp'
        body['security_group_rule']['port_range_min'] = 80
        body['security_group_rule']['port_range_max'] = 80
        self.neutronclient.create_security_group_rule(body)

        # Allow Redis traffic
        body['security_group_rule']['protocol'] = 'tcp'
        body['security_group_rule']['port_range_min'] = 6379
        body['security_group_rule']['port_range_max'] = 6379
        self.neutronclient.create_security_group_rule(body)

        # Allow Nuttcp traffic
        body['security_group_rule']['protocol'] = 'tcp'
        body['security_group_rule']['port_range_min'] = 5000
        body['security_group_rule']['port_range_max'] = 6000
        self.neutronclient.create_security_group_rule(body)

        body['security_group_rule']['protocol'] = 'tcp'
        body['security_group_rule']['port_range_min'] = 12000
        body['security_group_rule']['port_range_max'] = 13000
        self.neutronclient.create_security_group_rule(body)

        body['security_group_rule']['protocol'] = 'udp'
        body['security_group_rule']['port_range_min'] = 123
        body['security_group_rule']['port_range_max'] = 123
        self.neutronclient.create_security_group_rule(body)

        body['security_group_rule']['protocol'] = 'udp'
        body['security_group_rule']['port_range_min'] = 5000
        body['security_group_rule']['port_range_max'] = 6000
        self.neutronclient.create_security_group_rule(body)

        body['security_group_rule']['protocol'] = 'udp'
        body['security_group_rule']['port_range_min'] = 12000
        body['security_group_rule']['port_range_max'] = 14000
        self.neutronclient.create_security_group_rule(body)

        body['security_group_rule']['protocol'] = 'udp'
        body['security_group_rule']['port_range_min'] = 319
        body['security_group_rule']['port_range_max'] = 320
        self.neutronclient.create_security_group_rule(body)

        self.secgroup = group
        self.secgroup_name = group_name

    def delete_secgroup(self):
        """
        Delete the security group
        Sometimes this maybe in use if instance is just deleted
        Add a retry mechanism
        """
        if not self.secgroup:
            return True

        for _ in range(10):
            try:
                self.neutronclient.delete_security_group(self.secgroup['id'])
                return True
            except Exception:
                time.sleep(2)

        LOG.error('Failed while deleting security group %s.' % self.secgroup['id'])
        return False

class KeyPair(object):

    def __init__(self, novaclient):
        self.keypair = None
        self.keypair_name = None
        self.novaclient = novaclient

    def add_public_key(self, name, public_key_file=None):
        """
        Add the KloudBuster public key to openstack
        """
        public_key = None
        try:
            with open(os.path.expanduser(public_key_file)) as pkf:
                public_key = pkf.read()
        except IOError as exc:
            LOG.error("Cannot open public key file %s: %s" % (public_key_file,
                                                              exc))
        LOG.info("Adding public key %s" % name)
        keypair = self.novaclient.keypairs.create(name, public_key)
        self.keypair = keypair
        self.keypair_name = name

    def remove_public_key(self):
        """
        Remove the keypair created by KloudBuster
        """
        if self.keypair:
            self.novaclient.keypairs.delete(self.keypair)

class Flavor(object):

    def __init__(self, novaclient):
        self.novaclient = novaclient

    def get(self, name):
        flavor = None
        try:
            flavor = vars(self.novaclient.flavors.find(name=name))
        except Exception:
            pass

        return flavor

    def list(self):
        return self.novaclient.flavors.list()

    def create_flavor(self, flavor_dict):
        '''Delete the old flavor with same name if any and create a new one

        flavor_dict: dict with following keys: name, ram, vcpus, disk, ephemeral
        '''
        name = flavor_dict['name']
        flavor = self.get(name)
        if flavor:
            LOG.info('Deleting old flavor %s', name)
            self.delete_flavor(flavor)
        LOG.info('Creating flavor %s', name)
        return self.novaclient.flavors.create(**flavor_dict)

    def delete_flavor(self, flavor):
        try:
            flavor.delete()
        except Exception:
            pass

class NovaQuota(object):

    def __init__(self, novaclient, tenant_id):
        self.novaclient = novaclient
        self.tenant_id = tenant_id

    def get(self):
        return vars(self.novaclient.quotas.get(self.tenant_id))

    def update_quota(self, **kwargs):
        self.novaclient.quotas.update(self.tenant_id, **kwargs)
