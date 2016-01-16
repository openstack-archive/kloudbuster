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
#

import abc

import log as logging

LOG = logging.getLogger(__name__)


# A base class for all tools that can be associated to an instance
class PerfTool(object):
    __metaclass__ = abc.ABCMeta

    def __init__(self, instance, tool_name):
        self.instance = instance
        self.name = tool_name
        self.pid = None

    # Terminate pid if started
    def dispose(self):
        if self.pid:
            # Terminate the server
            LOG.kbdebug("[%s] Terminating %s" % (self.instance.vm_name,
                                                 self.name))
            self.instance.ssh.kill_proc(self.pid)
            self.pid = None

    def parse_error(self, msg):
        return {'error': msg, 'tool': self.name}

    @abc.abstractmethod
    def cmd_parser_run_client(self, status, stdout, stderr):
        # must be implemented by sub classes
        return None

    @staticmethod
    @abc.abstractmethod
    def consolidate_results(results):
        # must be implemented by sub classes
        return None
