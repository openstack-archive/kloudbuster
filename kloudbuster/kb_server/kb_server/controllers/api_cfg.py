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

import hashlib
import json
import os
import sys
import traceback
kb_main_path = os.path.split(os.path.abspath(__file__))[0] + "/../../.."
sys.path.append(kb_main_path)

from credentials import Credentials
from kb_session import KBSession
from kb_session import KBSessionManager
import log as logging

from configure import Configuration
from kb_config import KBConfig
from pecan import expose
from pecan import response

class ConfigController(object):

    @expose(generic=True)
    def default_config(self):
        kb_config = KBConfig()
        # @TODO(Bug in Python???)
        # return json.dumps(dict(kb_config.config_scale))
        return str(kb_config.config_scale)

    @expose(generic=True)
    def running_config(self, *args):
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text
        if KBSessionManager.has(session_id):
            kb_config_obj = KBSessionManager.get(session_id).kb_config
            config_scale = kb_config_obj.config_scale
            config_scale['server'] = kb_config_obj.server_cfg
            config_scale['client'] = kb_config_obj.client_cfg
            config_scale = dict(config_scale)
            # @TODO(Bug in Python???)
            # return json.dumps(config_scale)
            return str(config_scale)
        else:
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text

    @running_config.when(method='POST')
    def running_config_POST(self, arg):
        try:
            # Expectation:
            # {
            #  'credentials': {'tested-rc': '<STRING>', 'tested-passwd': '<STRING>',
            #                  'testing-rc': '<STRING>', 'testing-passwd': '<STRING>'},
            #  'kb_cfg': {<USER_OVERRIDED_CONFIGS>},
            #  'topo_cfg': {<TOPOLOGY_CONFIGS>}
            #  'tenants_cfg': {<TENANT_AND_USER_LISTS_FOR_REUSING>}
            # }
            user_config = json.loads(arg)

            # Parsing credentials from application input
            cred_config = user_config['credentials']
            cred_tested = Credentials(openrc_contents=cred_config['tested-rc'],
                                      pwd=cred_config['tested-passwd'])
            if ('testing-rc' in cred_config and
               cred_config['testing-rc'] != cred_config['tested-rc']):
                cred_testing = Credentials(openrc_contents=cred_config['testing-rc'],
                                           pwd=cred_config['testing-passwd'])
            else:
                # Use the same openrc file for both cases
                cred_testing = cred_tested

            session_id = hashlib.md5(str(cred_config)).hexdigest()
            kb_config = KBConfig()
            if KBSessionManager.has(session_id):
                response.status = 403
                response.text = u"Session is already existed."
                return response.text

            # Parsing server and client configs from application input
            # Save the public key into a temporary file
            if 'public_key' in user_config['kb_cfg']:
                pubkey_filename = '/tmp/kb_public_key.pub'
                f = open(pubkey_filename, 'w')
                f.write(user_config['kb_cfg']['public_key_file'])
                f.close()
                kb_config.config_scale['public_key_file'] = pubkey_filename

            if 'prompt_before_run' in user_config['kb_cfg']:
                kb_config.config_scale['prompt_before_run'] = False

            if user_config['kb_cfg']:
                alt_config = Configuration.from_string(user_config['kb_cfg']).configure()
                kb_config.config_scale = kb_config.config_scale.merge(alt_config)

            # Parsing topology configs from application input
            if 'topo_cfg' in user_config:
                topo_cfg = Configuration.from_string(user_config['topo_cfg']).configure()
            else:
                topo_cfg = None

            # Parsing tenants configs from application input
            if 'tenants_list' in user_config:
                tenants_list = Configuration.from_string(user_config['tenants_list']).configure()
            else:
                tenants_list = None
        except Exception:
            response.status = 400
            response.text = u"Error while parsing configurations: \n%s" % (traceback.format_exc)
            return response.text

        logging.setup("kloudbuster", logfile="/tmp/kb_log_%s" % session_id)
        kb_config.init_with_rest_api(cred_tested=cred_tested,
                                     cred_testing=cred_testing,
                                     topo_cfg=topo_cfg,
                                     tenants_list=tenants_list)

        kb_session = KBSession()
        kb_session.kb_config = kb_config
        KBSessionManager.add(session_id, kb_session)

        return str(session_id)

    @running_config.when(method='PUT')
    def running_config_PUT(self, *args):
        # @TODO(Not completed! ENOTSUP)
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text
        if KBSessionManager.has(session_id):
            # kb_session = KBSessionManager.get(session_id)
            #
            #
            #
            return "OK!"
        else:
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text

    @running_config.when(method='DELETE')
    def running_config_DELETE(self, *args):
        if len(args):
            session_id = args[0]
        else:
            response.status = 400
            response.text = u"Please specify the session_id."
            return response.text
        if KBSessionManager.has(session_id):
            kb_session = KBSessionManager.get(session_id)
            if kb_session.kloudbuster:
                kb_session.kloudbuster.dispose()
            KBSessionManager.delete(session_id)
            return "OK!"
        else:
            response.status = 404
            response.text = u"Session ID is not found or invalid."
            return response.text
