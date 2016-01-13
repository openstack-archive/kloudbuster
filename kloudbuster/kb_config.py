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
import sys
import yaml

from attrdict import AttrDict
import log as logging
from oslo_config import cfg
from pkg_resources import resource_string

import credentials
import kb_vm_agent

CONF = cfg.CONF
LOG = logging.getLogger(__name__)

class KBConfigParseException(Exception):
    pass

# Some hardcoded client side options we do not want users to change
hardcoded_client_cfg = {
    # Number of tenants to be created on the cloud
    'number_tenants': 1,

    # Number of routers to be created within the context of each User
    'routers_per_tenant': 1,

    # Number of networks to be created within the context of each Router
    # Assumes 1 subnet per network
    'networks_per_router': 1,

    # Number of VM instances to be created within the context of each Network
    'vms_per_network': 1,

    # Number of security groups per network
    'secgroups_per_network': 1
}

def get_absolute_path_for_file(file_name):
    '''
    Return the filename in absolute path for any file
    passed as relateive path.
    '''
    if os.path.isabs(__file__):
        abs_file_path = os.path.join(__file__.split("kb_config.py")[0],
                                     file_name)
    else:
        abs_file = os.path.abspath(__file__)
        abs_file_path = os.path.join(abs_file.split("kb_config.py")[0],
                                     file_name)

    return abs_file_path

class KBConfig(object):

    def __init__(self):
        # The default configuration file for KloudBuster
        default_cfg = resource_string(__name__, "cfg.scale.yaml")
        # Read the configuration file
        self.config_scale = AttrDict(yaml.safe_load(default_cfg))
        self.alt_cfg = None
        self.cred_tested = None
        self.cred_testing = None
        self.server_cfg = None
        self.client_cfg = None
        self.topo_cfg = None
        self.tenants_list = None
        self.storage_mode = False

    def update_configs(self):
        # Initialize the key pair name
        if self.config_scale['public_key_file']:
            # verify the public key file exists
            if not os.path.exists(self.config_scale['public_key_file']):
                LOG.error('Error: Invalid public key file: ' + self.config_scale['public_key_file'])
                sys.exit(1)
        else:
            # pick the user's public key if there is one
            pub_key = os.path.expanduser('~/.ssh/id_rsa.pub')
            if os.path.isfile(pub_key):
                self.config_scale['public_key_file'] = pub_key
                LOG.info('Using %s as public key for all VMs' % (pub_key))
            else:
                LOG.warn('No public key is found or specified to instantiate VMs. '
                         'You will not be able to access the VMs spawned by KloudBuster.')

        if self.storage_mode and not self.config_scale.client['volume_size']:
            LOG.error('You have to specify a volumn size in order to run '
                      'storage performance tests.')
            raise KBConfigParseException()

        if self.alt_cfg:
            self.config_scale = self.config_scale + AttrDict(self.alt_cfg)

        # Use the default image name for Glance
        # defaults to something like "kloudbuster_v3"
        if not self.config_scale['image_name']:
            self.config_scale['image_name'] = kb_vm_agent.get_image_name()

        # A bit of config dict surgery, extract out the client and server side
        # and transplant the remaining (common part) into the client and server dict
        self.server_cfg = AttrDict(self.config_scale.pop('server'))
        self.client_cfg = AttrDict(self.config_scale.pop('client'))
        self.server_cfg.update(self.config_scale)
        self.client_cfg.update(self.config_scale)

        # Hardcode a few client side options
        self.client_cfg.update(hardcoded_client_cfg)

        # Adjust the VMs per network on the client side to match the total
        # VMs on the server side (1:1)
        # There is an additional VM in client kloud as a proxy node
        self.client_cfg['vms_per_network'] =\
            self.get_total_vm_count(self.server_cfg) + 1

        self.config_scale['server'] = self.server_cfg
        self.config_scale['client'] = self.client_cfg

    def init_with_cli(self):
        self.storage_mode = CONF.storage
        self.get_credentials()
        self.get_configs()
        self.get_topo_cfg()
        self.get_tenants_list()
        self.update_configs()

    def init_with_rest_api(self, **kwargs):
        self.cred_tested = kwargs['cred_tested']
        self.cred_testing = kwargs['cred_testing']

    def update_with_rest_api(self, **kwargs):
        self.alt_cfg = kwargs.get('alt_cfg', None)
        self.topo_cfg = kwargs.get('topo_cfg', self.topo_cfg)
        self.tenants_list = kwargs.get('tenants_list', self.tenants_list)
        self.update_configs()

    def get_total_vm_count(self, config):
        return (config['number_tenants'] * config['routers_per_tenant'] *
                config['networks_per_router'] * config['vms_per_network'])

    def get_credentials(self):
        # Retrieve the credentials
        self.cred_tested = credentials.Credentials(openrc_file=CONF.tested_rc,
                                                   pwd=CONF.tested_passwd,
                                                   no_env=CONF.no_env)
        if CONF.testing_rc and CONF.testing_rc != CONF.tested_rc:
            self.cred_testing = credentials.Credentials(openrc_file=CONF.testing_rc,
                                                        pwd=CONF.testing_passwd,
                                                        no_env=CONF.no_env)
        else:
            # Use the same openrc file for both cases
            self.cred_testing = self.cred_tested

    def get_configs(self):
        if CONF.config:
            try:
                with open(CONF.config) as f:
                    alt_config = AttrDict(yaml.safe_load(f))
                self.config_scale = self.config_scale + alt_config
            except TypeError:
                # file can be empty
                pass

    def get_topo_cfg(self):
        if CONF.topology:
            with open(CONF.topology) as f:
                self.topo_cfg = AttrDict(yaml.safe_load(f))

    def get_tenants_list(self):
        if CONF.tenants_list:
            with open(CONF.tenants_list) as f:
                self.tenants_list = AttrDict(yaml.safe_load(f))
            try:
                self.config_scale['number_tenants'] = 1
            except Exception as e:
                LOG.error('Cannot parse the count of tenant/user from the config file.')
                raise KBConfigParseException(e.message)
