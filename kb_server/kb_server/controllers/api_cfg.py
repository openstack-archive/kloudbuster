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
import hashlib
import json
import os
import sys
import traceback
kb_main_path = os.path.split(os.path.abspath(__file__))[0] + "/../../../kloudbuster"
sys.path.append(kb_main_path)

from attrdict import AttrDict
from credentials import Credentials
from kb_session import KBSession
from kb_session import KBSessionManager
import log as logging

from kb_config import KBConfig
from pecan import expose
from pecan import response

class ConfigController(object):

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

    def update_config(self, kb_config, user_config):
        # Parsing server and client configs from application input
        # Save the public key into a temporary file
        if 'public_key' in user_config['kb_cfg']:
            pubkey_filename = '/tmp/kb_public_key.pub'
            with open(pubkey_filename, 'w') as f:
                f.write(user_config['kb_cfg']['public_key_file'])
            kb_config.config_scale['public_key_file'] = pubkey_filename

        kb_config.config_scale.client['prompt_before_run'] = False
        kb_config.config_scale['cleanup_resources'] = False

        # Parsing the KloudBuster/topology/tenants configs from application input
        alt_config = AttrDict(user_config['kb_cfg']) if 'kb_cfg' in user_config else None
        topo_cfg = AttrDict(user_config['topo_cfg']) if 'topo_cfg' in user_config else None
        tenants_list = AttrDict(user_config['tenants_list'])\
            if 'tenants_list' in user_config else None

        key = ['alt_cfg', 'topo_cfg', 'tenants_list']
        val = [alt_config, topo_cfg, tenants_list]
        kwargs = dict([(k, v) for k, v in zip(key, val) if v])
        kb_config.update_with_rest_api(**kwargs)

    @expose(generic=True)
    def default_config(self):
        kb_config = KBConfig()
        return json.dumps(dict(kb_config.config_scale))

    @expose(generic=True)
    @check_session_id
    def running_config(self, *args):
        session_id = args[0]
        kb_config_obj = KBSessionManager.get(session_id).kb_config
        config_scale = dict(kb_config_obj.config_scale)
        return json.dumps(config_scale)

    @running_config.when(method='POST')
    def running_config_POST(self, arg):
        try:
            # Expectation:
            # {
            #   'credentials': {'tested-rc': '<STRING>', 'tested-passwd': '<STRING>',
            #                   'testing-rc': '<STRING>', 'testing-passwd': '<STRING>'},
            #   'kb_cfg': {<USER_OVERRIDED_CONFIGS>},
            #   'topo_cfg': {<TOPOLOGY_CONFIGS>}
            #   'tenants_cfg': {<TENANT_AND_USER_LISTS_FOR_REUSING>}
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

            kb_config = KBConfig()
            session_id = hashlib.md5(str(cred_config)).hexdigest()
            if KBSessionManager.has(session_id):
                response.status = 403
                response.text = u"Session is already existed."
                return response.text
        except Exception:
            response.status = 400
            response.text = u"Error while parsing configurations: \n%s" % (traceback.format_exc())
            return response.text

        logging.setup("kloudbuster", logfile="/tmp/kb_log_%s" % session_id)
        kb_config.init_with_rest_api(cred_tested=cred_tested,
                                     cred_testing=cred_testing)
        self.update_config(kb_config, user_config)

        kb_session = KBSession()
        kb_session.kb_config = kb_config
        KBSessionManager.add(session_id, kb_session)

        return str(session_id)

    @running_config.when(method='PUT')
    @check_session_id
    def running_config_PUT(self, *args, **kwargs):
        session_id = args[0]
        status = KBSessionManager.get(session_id).kb_status
        try:
            user_config = json.loads(kwargs['arg'])
            allowed_status = ['READY']
        except Exception as e:
            response.status = 400
            response.text = u"Invalid JSON: \n%s" % (e.message)
            return response.text

        # http_tool_configs for client VMs is allowed to changed under "STAGED" status
        if ('kb_cfg' in user_config and len(user_config['kb_cfg']) == 1) and \
           ('client' in user_config['kb_cfg'] and len(user_config['kb_cfg']['client']) == 1) and \
           ('http_tool_configs' in user_config['kb_cfg']['client']):
            allowed_status.append('STAGED')

        if status in allowed_status:
            # Expectation:
            # {
            #   'kb_cfg': {<USER_OVERRIDED_CONFIGS>},
            #   'topo_cfg': {<TOPOLOGY_CONFIGS>}
            #   'tenants_cfg': {<TENANT_AND_USER_LISTS_FOR_REUSING>}
            # }
            try:
                kb_config = KBSessionManager.get(session_id).kb_config
                self.update_config(kb_config, user_config)
            except Exception:
                response.status = 400
                response.text = u"Error while parsing configurations: \n%s" %\
                    (traceback.format_exc())
                return response.text
        else:
            response.status = 403
            response.text = u"Cannot update configuration if KloudBuster is not at READY."
            return response.text

        return "OK!"

    @running_config.when(method='DELETE')
    @check_session_id
    def running_config_DELETE(self, *args):
        session_id = args[0]
        kb_session = KBSessionManager.get(session_id)
        status = kb_session.kb_status
        if status != "READY":
            response.status = 403
            response.text = u"Session can be destroyed only if it is at READY."
            return response.text
        if kb_session.kloudbuster:
            kb_session.kloudbuster.dispose()
        KBSessionManager.delete(session_id)
        return "OK!"
