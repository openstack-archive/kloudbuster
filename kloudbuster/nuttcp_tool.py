# Copyright 2016 Cisco Systems, Inc.  All rights reserved.
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

import json

from perf_tool import PerfTool


class NuttcpTool(PerfTool):

    def __init__(self, instance):
        PerfTool.__init__(self, instance, 'nuttcp')
        self.keys = ['thoroughput', 'time', 'rate', 'tx_cpu', 'jitter', 'latency']

    def cmd_parser_run_client(self, status, stdout, stderr):
        if status:
            return self.parse_error(stderr)
        return json.loads(stdout)

    @staticmethod
    def consolidate_results(results):
        return results

    @staticmethod
    def consolidate_samples(results, vm_count):
        return results
