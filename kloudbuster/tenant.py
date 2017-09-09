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
import base_storage

from keystoneclient import exceptions as keystone_exception
import log as logging
import users

LOG = logging.getLogger(__name__)

class KBQuotaCheckException(Exception):
    pass

class Tenant(object):
    """
    Holds the tenant resources
    1. Provides ability to create users in a tenant
    2. Uses the User class to perform all user resource creation and deletion
    """

    def __init__(self, tenant_name, kloud, tenant_quota, reusing_users=None):
        """
        Holds the tenant name
        tenant id and keystone client
        Also stores the auth_url for constructing credentials
        Stores the shared network in case of testing and
        tested cloud being on same cloud
        """
        self.kloud = kloud
        self.res_logger = kloud.res_logger
        self.tenant_name = tenant_name
        self.tenant_api = self.kloud.keystone.tenants \
            if self.kloud.keystone.version == 'v2.0' else self.kloud.keystone.projects
        if not self.kloud.reusing_tenants:
            self.tenant_object = self._get_tenant()
            self.tenant_id = self.tenant_object.id
        else:
            LOG.info("Using tenant: " + self.tenant_name)
            # Only admin can retrive the object via Keystone API
            self.tenant_object = None
            self.tenant_id = self.kloud.keystone.tenant_id

        self.tenant_quota = tenant_quota
        self.reusing_users = reusing_users
        # Contains a list of user instance objects
        self.user_list = []

    def _get_tenant(self):

        '''
        Create or reuse a tenant object of a given name
        '''
        try:
            LOG.info("Creating tenant: " + self.tenant_name)
            tenant_object = \
                self.tenant_api.create(self.tenant_name,
                                       # domain="default",
                                       description="KloudBuster tenant",
                                       enabled=True)
            return tenant_object
        except keystone_exception.Conflict as exc:
            # ost likely the entry already exists:
            # Conflict: Conflict occurred attempting to store project - Duplicate Entry (HTTP 409)
            if exc.http_status != 409:
                raise exc
            LOG.info("Tenant %s already present, reusing it" % self.tenant_name)
            return self.tenant_api.find(name=self.tenant_name)

        # Should never come here
        raise Exception()

    def update_quota(self):
        nova_quota = base_compute.NovaQuota(self.kloud.nova_client, self.tenant_id)
        nova_quota.update_quota(**self.tenant_quota['nova'])

        if self.kloud.storage_mode:
            cinder_quota = base_storage.CinderQuota(self.kloud.cinder_client, self.tenant_id)
            cinder_quota.update_quota(**self.tenant_quota['cinder'])

        neutron_quota = base_network.NeutronQuota(self.kloud.neutron_client, self.tenant_id)
        neutron_quota.update_quota(self.tenant_quota['neutron'])

    def check_quota(self):

        # Nova/Cinder/Neutron quota check
        tenant_id = self.tenant_id
        meet_quota = True
        for quota_type in ['nova', 'cinder', 'neutron']:
            if quota_type == 'nova':
                quota_manager = base_compute.NovaQuota(self.kloud.nova_client, tenant_id)
            elif quota_type == 'cinder':
                quota_manager = base_storage.CinderQuota(self.kloud.cinder_client, tenant_id)
            else:
                quota_manager = base_network.NeutronQuota(self.kloud.neutron_client, tenant_id)

            meet_quota = True
            quota = quota_manager.get()
            for key, value in self.tenant_quota[quota_type].iteritems():
                if quota[key] < value:
                    meet_quota = False
                    break

        if not meet_quota:
            LOG.error('%s quota is too small. Minimum requirement: %s.' %
                      (quota_type, self.tenant_quota[quota_type]))
            raise KBQuotaCheckException()

    def create_resources(self):
        """
        Creates all the entities associated with
        a user offloads tasks to user class
        """
        if self.kloud.reusing_tenants:
            self.check_quota()
        else:
            self.update_quota()

        if self.reusing_users:
            user_name = self.reusing_users['username']
            password = self.reusing_users['password']
            user_instance = users.User(user_name, password, self, '_member_')
            self.user_list.append(user_instance)
        else:
            user_name = self.tenant_name + "-U"
            user_instance = users.User(user_name, user_name, self,
                                       self.kloud.scale_cfg['keystone_admin_role'])
            # Global list with all user instances
            self.user_list.append(user_instance)
            self.res_logger.log('users', user_instance.user_name, user_instance.user.id)

        for user_instance in self.user_list:
            # Now create the user resources like routers which inturn trigger network and
            # vm creation
            user_instance.create_resources()

    def get_first_network(self):
        if self.user_list:
            return self.user_list[0].get_first_network()
        return None

    def get_all_instances(self):
        all_instances = []
        for user in self.user_list:
            all_instances.extend(user.get_all_instances())
        return all_instances

    def get_prefix(self):
        return self.kloud.get_prefix() + '_' + self.prefix

    def delete_resources(self):
        """
        Delete all user resources and than
        deletes the tenant
        """
        flag = True
        # Delete all the users in the tenant along with network and compute elements
        for user in self.user_list:
            flag = flag & user.delete_resources()

        if not self.reusing_users:
            # Delete the tenant (self)
            self.tenant_api.delete(self.tenant_id)

        return flag
