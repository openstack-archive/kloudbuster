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

import log as logging
from time import gmtime
from time import strftime

LOG = logging.getLogger(__name__)

class KBResTypeInvalid(Exception):
    pass

class KBResLogger(object):

    def __init__(self):
        self.resource_list = {}
        for key in ['tenants', 'users', 'flavors', 'keypairs', 'routers',
                    'networks', 'sec_groups', 'instances', 'floating_ips',
                    'volumes']:
            self.resource_list[key] = []

    def log(self, res_type, name, id):
        if res_type in self.resource_list:
            self.resource_list[res_type].append({'name': name, 'id': id})
        else:
            raise KBResTypeInvalid()

    @staticmethod
    def dump_and_save(role, res_dict):
        res_text = ""
        filename = "kb_%s_%s.log" % (strftime("%Y%m%d_%H%M%S", gmtime()), role)
        for key in res_dict:
            for item in res_dict[key]:
                line = "%s|%s|%s\n" % (key, item['name'], item['id'])
                res_text = res_text + line

        fout = open(filename, 'w')
        fout.write(res_text)
        fout.close()
        LOG.info('Resources list is saved to file: %s.', filename)
