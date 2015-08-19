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
import traceback
kb_main_path = os.path.split(os.path.abspath(__file__))[0] + "/../../.."
sys.path.append(kb_main_path)

from api_cfg import kb_config as kb_config
from api_cfg import lock as kb_config_lock
from kloudbuster import KloudBuster

from pecan import expose
from pecan import response

class KBController(object):

    def __init__(self):
        self.kb_status = 'READY'

    @expose(generic=True)
    def status(self):
        return self.kb_status

    @expose(generic=True)
    def run(self):
        if (not kb_config.cred_tested) or (not kb_config.cred_testing):
            response.status = 403
            response.text = u"Credentials to the cloud are missing."\
                            "(Forgot to provide the config?)"
            return response.text
        if not kb_config_lock.acquire(False):
            response.status = 403
            response.text = u"An instance of KloudBuster is running, you cannot "\
                            "change the config until the run is finished!"
            return response.text

        try:
            kloudbuster = KloudBuster(
                kb_config.cred_tested, kb_config.cred_testing,
                kb_config.server_cfg, kb_config.client_cfg,
                kb_config.topo_cfg, kb_config.tenants_list)
            if kloudbuster.check_and_upload_images():
                kloudbuster.run()
        except Exception:
            response.status = 403
            response.text = u"Error while running KloudBuster:\n%s" % traceback.format_exc()
            kb_config_lock.release()
            return response.text

        kb_config_lock.release()
        return "OK!"
