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

import time

import log as logging

LOG = logging.getLogger(__name__)

class KBVolCreationException(Exception):
    pass

class BaseStorage(object):
    """
    The Base class for cinder storage resources
    """

    def __init__(self, cinderclient):
        self.cinderclient = cinderclient

    def create_vol(self, size, name=None):
        vol = self.cinderclient.volumes.create(size, name=name)
        for _ in range(10):
            if vol.status == 'creating':
                time.sleep(1)
            elif vol.status == 'available':
                break
            elif vol.status == 'error':
                raise KBVolCreationException('Not enough disk space in the host?')
            vol = self.cinderclient.volumes.get(vol.id)

        return vol

    def delete_vol(self, volume):
        """
        Sometimes this maybe in use if volume is just deleted
        Add a retry mechanism
        """
        for _ in range(10):
            try:
                self.cinderclient.volumes.force_delete(volume)
                return True
            except Exception:
                time.sleep(2)

        LOG.error('Failed while deleting volume %s.' % volume.id)
        return False

    # DO NOT USE THESE TWO APIS, THEY WILL CREATE TROUBLES WHEN TRYING TO DETACH
    # OR DELETE THE VOLUMES. Volume attachment should be done via NOVA not CINDER
    # def attach_vol(self, volume, instance_uuid, mountpoint):
    #     self.cinderclient.volumes.attach(volume, instance_uuid, mountpoint)
    # def detach_vol(self, volume):
    #     self.cinderclient.volumes.detach(volume)


class CinderQuota(object):

    def __init__(self, cinderclient, tenant_id):
        self.cinderclient = cinderclient
        self.tenant_id = tenant_id

    def get(self):
        return vars(self.cinderclient.quotas.get(self.tenant_id))

    def update_quota(self, **kwargs):
        self.cinderclient.quotas.update(self.tenant_id, **kwargs)
