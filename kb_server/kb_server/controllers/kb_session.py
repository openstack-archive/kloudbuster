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

import threading

KB_SESSIONS = {}
KB_SESSIONS_LOCK = threading.Lock()

class KBSessionManager(object):

    @staticmethod
    def has(session_id):
        global KB_SESSIONS
        return True if session_id in KB_SESSIONS else False

    @staticmethod
    def get(session_id):
        global KB_SESSIONS
        return KB_SESSIONS[session_id] if KBSessionManager.has(session_id) else None

    @staticmethod
    def add(session_id, new_session):
        global KB_SESSIONS
        global KB_SESSIONS_LOCK
        KB_SESSIONS_LOCK.acquire()
        KB_SESSIONS[session_id] = new_session
        KB_SESSIONS_LOCK.release()

    @staticmethod
    def delete(session_id):
        global KB_SESSIONS
        global KB_SESSIONS_LOCK
        KB_SESSIONS_LOCK.acquire()
        KB_SESSIONS.pop(session_id)
        KB_SESSIONS_LOCK.release()


class KBSession(object):
    def __init__(self):
        self.kb_status = 'READY'
        self.first_run = True
        self.kb_config = None
        self.kloudbuster = None

    def sync_cfg(self, par_list):
        if 'server_cfg' in par_list:
            self.kloudbuster.server_cfg = self.kb_config.server_cfg
        if 'client_cfg' in par_list:
            self.kloudbuster.client_cfg = self.kb_config.client_cfg
        if 'topo_cfg' in par_list and self.kb_config.topo_cfg:
            self.kloudbuster.topology = self.kb_config.topo_cfg
        if 'tenants_list' in par_list and self.kb_config.tenants_list:
            self.kloudbuster.tenants_list = self.kb_config.tenants_list
