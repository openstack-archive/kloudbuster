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

import base_compute
import base_network
from cinderclient import client as cinderclient
from keystoneclient import exceptions as keystone_exception
import log as logging
from neutronclient.neutron import client as neutronclient
from novaclient import client as novaclient

LOG = logging.getLogger(__name__)

class User(object):
    """
    User class that stores router list
    Creates and deletes N routers based on num of routers
    """

    def __init__(self, user_name, password, tenant, user_role):
        """
        Store all resources
        1. Keystone client object
        2. Tenant and User information
        3. nova and neutron clients
        4. router list
        """
        self.user_name = user_name
        self.password = password
        self.tenant = tenant
        self.res_logger = tenant.res_logger
        self.router_list = []
        # nova, neutron and cinder client for this user
        session = self.tenant.kloud.credentials.get_user_session(user_name, password,
                                                                 tenant.tenant_name)

        # Create nova/neutron/cinder clients to be used for all operations
        self.neutron_client = neutronclient.Client('2.0', endpoint_type='publicURL',
                                                   session=session)
        self.nova_client = novaclient.Client('2', endpoint_type='publicURL',
                                             http_log_debug=True, session=session)
        self.cinder_client = cinderclient.Client('2', endpoint_type='publicURL',
                                                 session=session)
        # Each user is associated to 1 key pair at most
        self.key_pair = None
        self.key_name = None

        # Create the user within the given tenant associate
        # admin role with user. We need admin role for user
        # since we perform VM placement in future
        #
        # If running on top of existing tenants/users, skip
        # the step for admin role association.
        if not self.tenant.reusing_users:
            self.user = self._get_user()
            current_role = self.tenant.kloud.keystone.roles.find(name=user_role)
            if self.tenant.kloud.keystone.version == 'v2.0':
                self.tenant.kloud.keystone.roles.add_user_role(
                    self.user, current_role, tenant.tenant_id)
            else:
                self.tenant.kloud.keystone.roles.grant(
                    current_role, user=self.user, project=tenant.tenant_id)
        else:
            # Only admin can retrive the object via Keystone API
            self.user = None
            LOG.info("Using user: " + self.user_name)


    def _create_user(self):
        LOG.info("Creating user: " + self.user_name)
        return self.tenant.kloud.keystone.users.create(name=self.user_name,
                                                       password=self.password,
                                                       email="kloudbuster@localhost",
                                                       tenant_id=self.tenant.tenant_id)

    def _get_user(self):
        '''
        Create a new user or reuse if it already exists (on a different tenant)
        delete the user and create a new one
        '''
        try:
            user = self._create_user()
            return user
        except keystone_exception.Conflict as exc:
            # Most likely the entry already exists (leftover from past failed runs):
            # Conflict: Conflict occurred attempting to store user - Duplicate Entry (HTTP 409)
            if exc.http_status != 409:
                raise exc
            # Try to repair keystone by removing that user
            LOG.warning("User creation failed due to stale user with same name: " +
                        self.user_name)
            user = self.tenant.kloud.keystone.users.find(name=self.user_name)
            LOG.info("Deleting stale user with name: " + self.user_name)
            self.tenant.kloud.keystone.users.delete(user)
            return self._create_user()

        # Should never come here
        raise Exception()

    def delete_resources(self):
        LOG.info("Deleting all user resources for user %s" % self.user_name)

        flag = True
        # Delete key pair
        if self.key_pair:
            self.key_pair.remove_public_key()

        # Delete all user routers
        for router in self.router_list:
            flag = flag & router.delete_router()

        if not self.tenant.reusing_users:
            # Finally delete the user
            self.tenant.kloud.keystone.users.delete(self.user.id)

        return flag

    def create_resources(self):
        """
        Creates all the User elements associated with a User
        1. Creates the routers
        2. Creates the neutron and nova client objects
        """

        config_scale = self.tenant.kloud.scale_cfg

        # Create the user's keypair if configured
        if config_scale.public_key_file:
            self.key_pair = base_compute.KeyPair(self.nova_client)
            self.key_name = self.user_name + '-K'
            self.res_logger.log('keypairs', self.key_name, "")
            self.key_pair.add_public_key(self.key_name, config_scale.public_key_file)

        # Find the external network that routers need to attach to
        if self.tenant.kloud.multicast_mode:
            router_instance = base_network.Router(self, is_dumb=True)
            self.router_list.append(router_instance)
            router_instance.create_network_resources(config_scale)

        else:
            external_network = base_network.find_external_network(self.neutron_client)
            # Create the required number of routers and append them to router list
            LOG.info("Creating routers and networks for tenant %s" % self.tenant.tenant_name)
            for router_count in range(config_scale['routers_per_tenant']):
                router_instance = base_network.Router(self)
                self.router_list.append(router_instance)
                router_name = self.user_name + "-R" + str(router_count)
                # Create the router and also attach it to external network
                router_instance.create_router(router_name, external_network)
                self.res_logger.log('routers', router_instance.router['router']['name'],
                                    router_instance.router['router']['id'])
                # Now create the network resources inside the router
                router_instance.create_network_resources(config_scale)

    def get_first_network(self):
        if self.router_list:
            return self.router_list[0].get_first_network()
        return None

    def get_all_instances(self):
        all_instances = []
        for router in self.router_list:
            all_instances.extend(router.get_all_instances())
        return all_instances
