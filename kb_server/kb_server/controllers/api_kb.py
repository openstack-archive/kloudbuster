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

import functools
import json
import logging
import os
import sys
import threading
import traceback
kb_main_path = os.path.split(os.path.abspath(__file__))[0] + "/../../../kloudbuster"
sys.path.append(kb_main_path)

from kb_session import KBSessionManager
from kloudbuster import __version__ as kb_version
from kloudbuster import KloudBuster

from pecan import expose
from pecan import response

LOG = logging.getLogger("kloudbuster")

class KBController(object):

    def __init__(self):
        self.kb_thread = None

    # Decorator to check for missing or invalid session ID
    def check_session_id(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            if not len(args):
                response.status = 404
                response.text = u"Please specify the session_id."
                return response.text
            if not KBSessionManager.has(args[0]):
                response.status = 404
                response.text = u"Session ID is not found or invalid."
                return response.text
            return func(self, *args, **kwargs)

        return wrapper

    def kb_stage_thread_handler(self, session_id):
        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'STAGING'
        kb_config = kb_session.kb_config
        try:
            kloudbuster = KloudBuster(
                kb_config.cred_tested, kb_config.cred_testing,
                kb_config.server_cfg, kb_config.client_cfg,
                kb_config.topo_cfg, kb_config.tenants_list)
            kb_session.kloudbuster = kloudbuster

            if kloudbuster.check_and_upload_images():
                kloudbuster.stage()
            kb_session.kb_status = 'STAGED'
        except Exception:
            LOG.warn(traceback.format_exc())
            kb_session.kb_status = 'ERROR'

    def kb_run_test_thread_handler(self, session_id):
        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'RUNNING'
        kloudbuster = kb_session.kloudbuster
        try:
            kloudbuster.run_test(
                config=kb_session.kb_config.client_cfg,
                http_test_only=not kb_session.first_run)
            kb_session.first_run = False
            kb_session.kb_status = 'STAGED'
        except Exception:
            LOG.warn(traceback.format_exc())
            kb_session.kb_status = 'ERROR'

    def kb_cleanup_thread_handler(self, session_id):
        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'CLEANING'
        kloudbuster = kb_session.kloudbuster
        try:
            kloudbuster.cleanup()
        except Exception:
            pass

        kb_session.kb_status = 'READY'

    @expose(generic=True)
    @check_session_id
    def status(self, *args):
        session_id = args[0]
        status = KBSessionManager.get(session_id).kb_status
        return status

    @expose(generic=True)
    @check_session_id
    def log(self, *args, **kwargs):
        session_id = args[0]
        offset = kwargs.get('offset', 0)
        try:
            offset = int(offset)
        except ValueError:
            response.status = 400
            response.text = u"Parameter 'offset' is invalid."
            return response.text

        kb_session = KBSessionManager.get(session_id)
        plog = kb_session.kloudbuster.dump_logs(offset=offset)\
            if kb_session.kloudbuster else ""
        return json.dumps(plog)

    @expose(generic=True)
    @check_session_id
    def report(self, *args, **kwargs):
        session_id = args[0]
        preport = None
        final = True if kwargs.get('final', '').lower() == 'true' else False
        kb_session = KBSessionManager.get(session_id)
        if kb_session.kloudbuster and kb_session.kloudbuster.kb_runner:
            preport = kb_session.kloudbuster.final_result\
                if final else kb_session.kloudbuster.kb_runner.report

        return json.dumps(preport)

    @expose(generic=True)
    def version(self):
        return kb_version

    @expose(generic=True)
    def stage(self, *args):
        response.status = 400
        response.text = u"Please POST to this resource."
        return response.text

    @stage.when(method='POST')
    @check_session_id
    def stage_POST(self, *args):
        session_id = args[0]
        if KBSessionManager.get(session_id).kb_status != 'READY':
            response.status = 403
            response.text = u"Unable to stage resources when status is not READY."
            return response.text

        self.kb_thread = threading.Thread(target=self.kb_stage_thread_handler, args=[session_id])
        self.kb_thread.daemon = True
        self.kb_thread.start()

        return "OK!"

    @expose(generic=True)
    def run_test(self, *args):
        response.status = 400
        response.text = u"Please POST to this resource."
        return response.text

    @run_test.when(method='POST')
    @check_session_id
    def run_test_POST(self, *args):
        session_id = args[0]
        if KBSessionManager.get(session_id).kb_status != 'STAGED':
            response.status = 403
            response.text = u"Unable to start the tests when status is not STAGED."
            return response.text

        self.kb_thread = threading.Thread(target=self.kb_run_test_thread_handler, args=[session_id])
        self.kb_thread.daemon = True
        self.kb_thread.start()

        return "OK!"

    @expose(generic=True)
    def cleanup(self, *args):
        response.status = 400
        response.text = u"Please POST to this resource."
        return response.text

    @cleanup.when(method='POST')
    @check_session_id
    def cleanup_POST(self, *args):
        session_id = args[0]
        allowed_status = ['STAGED', 'ERROR']
        if KBSessionManager.get(session_id).kb_status == 'READY':
            response.status = 403
            response.text = u"No resources has been staged, cleanup is not needed."
            return response.text
        if KBSessionManager.get(session_id).kb_status not in allowed_status:
            response.status = 403
            response.text = u"The session you specified is busy, please wait until "\
                "current operation is finished."
            return response.text

        self.kb_thread = threading.Thread(target=self.kb_cleanup_thread_handler, args=[session_id])
        self.kb_thread.daemon = True
        self.kb_thread.start()

        return "OK!"
