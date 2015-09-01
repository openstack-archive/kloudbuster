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

import json
import os
import sys
import threading
kb_main_path = os.path.split(os.path.abspath(__file__))[0] + "/../../../kloudbuster"
sys.path.append(kb_main_path)

from kb_session import KBSessionManager
from kloudbuster import __version__ as kb_version
from kloudbuster import KloudBuster

from pecan import expose
from pecan import response

class KBController(object):

    def __init__(self):
        self.kb_thread = None

    def kb_thread_handler(self, session_id):
        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'RUNNING'
        kb_config = kb_session.kb_config
        try:
            kloudbuster = KloudBuster(
                kb_config.cred_tested, kb_config.cred_testing,
                kb_config.server_cfg, kb_config.client_cfg,
                kb_config.topo_cfg, kb_config.tenants_list)
            kb_session.kloudbuster = kloudbuster

            if kloudbuster.check_and_upload_images():
                kloudbuster.run()
            kb_session.kb_status = 'READY'
        except Exception:
            kb_session.kb_status = 'ERROR'

    @expose(generic=True)
    def status(self, *args):
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text

        if KBSessionManager.has(session_id):
            status = KBSessionManager.get(session_id).kb_status
            return status
        else:
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text

    @expose(generic=True)
    def log(self, *args):
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text

        if KBSessionManager.has(session_id):
            kb_session = KBSessionManager.get(session_id)
            plog = kb_session.kloudbuster.dump_logs(offset=0)\
                if kb_session.kloudbuster else ""
            return json.dumps(plog)
        else:
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text

    @expose(generic=True)
    def report(self, *args):
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text

        if KBSessionManager.has(session_id):
            kb_session = KBSessionManager.get(session_id)
            preport = kb_session.kloudbuster.kb_runner.report\
                if kb_session.kloudbuster and kb_session.kloudbuster.kb_runner else ""
            return json.dumps(preport)
        else:
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text

    @expose(generic=True)
    def version(self):
        return kb_version

    @expose(generic=True)
    def run(self, *args):
        response.status = 400
        response.text = u"Please POST to this resource."
        return response.text

    @run.when(method='POST')
    def run_POST(self, *args):
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text
        if not KBSessionManager.has(session_id):
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text
        if KBSessionManager.get(session_id).kb_status == 'RUNNING':
            response.status = 403
            response.text = u"An instance of KloudBuster is already running."
            return response.text

        self.kb_thread = threading.Thread(target=self.kb_thread_handler, args=[session_id])
        self.kb_thread.daemon = True
        self.kb_thread.start()

        return "OK!"
