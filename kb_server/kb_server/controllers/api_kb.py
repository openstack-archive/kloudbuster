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
import threading
import traceback

from kb_session import KBSessionManager
from kloudbuster.kloudbuster import __version__ as kb_version

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
        try:
            if kb_session.kloudbuster.check_and_upload_images():
                kb_session.sync_cfg(["server_cfg", "client_cfg", "topo_cfg", "tenants_list"])
                kb_session.kloudbuster.stage()
            kb_session.kb_status = 'STAGED'
        except Exception:
            LOG.warning(traceback.format_exc())
            kb_session.kb_status = 'ERROR'

    def kb_run_test_thread_handler(self, session_id):
        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'RUNNING'
        kloudbuster = kb_session.kloudbuster
        try:
            kb_session.sync_cfg(["client_cfg"])
            kloudbuster.run_test(test_only=not kb_session.first_run)
            kb_session.first_run = False
            kb_session.kb_status = 'STAGED'
        except Exception:
            LOG.warning(traceback.format_exc())
            kb_session.kb_status = 'ERROR'

    def kb_cleanup_thread_handler(self, session_id):
        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'CLEANING'
        kloudbuster = kb_session.kloudbuster
        try:
            kloudbuster.cleanup()
            kloudbuster.final_result = []
        except Exception:
            pass

        kb_session.first_run = True
        kb_session.kb_status = 'READY'

    @expose(generic=True)
    @check_session_id
    def status(self, *args):
        session_id = args[0]
        kb_session = KBSessionManager.get(session_id)
        status = kb_session.kb_status
        kloudbuster = kb_session.kloudbuster
        status_dict = {'status': status}
        if status == "STAGING":
            status_dict['server_vm_count'] =\
                getattr(getattr(kloudbuster, 'kloud', None), 'vm_up_count', 0)
            status_dict['client_vm_count'] = kloudbuster.testing_kloud.vm_up_count
        return json.dumps(status_dict)

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
        final = True if kwargs.get('final', '').lower() == 'true' else False
        preport = [] if final else None
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
            response.text = u"Unable to start the tests when status is not at STAGED."
            return response.text

        self.kb_thread = threading.Thread(target=self.kb_run_test_thread_handler, args=[session_id])
        self.kb_thread.daemon = True
        self.kb_thread.start()

        return "OK!"

    @expose(generic=True)
    def stop_test(self, *args):
        response.status = 400
        response.text = u"Please POST to this resource."
        return response.text

    @stop_test.when(method='POST')
    @check_session_id
    def stop_test_POST(self, *args):
        session_id = args[0]
        if KBSessionManager.get(session_id).kb_status != 'RUNNING':
            response.status = 403
            response.text = u"Unable to stop the tests when status is not at RUNNING."
            return response.text

        kb_session = KBSessionManager.get(session_id)
        kb_session.kb_status = 'STOPPING'
        try:
            kb_session.kloudbuster.stop_test()
        except Exception:
            LOG.warning(traceback.format_exc())
            kb_session.kb_status = 'ERROR'

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
