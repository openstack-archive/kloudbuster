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

# from hdrh.histogram import HdrHistogram
import log as logging

LOG = logging.getLogger(__name__)


class FioTool(PerfTool):

    def __init__(self, instance):
        PerfTool.__init__(self, instance, 'fio')

    def cmd_parser_run_client(self, status, stdout, stderr):
        if status:
            return self.parse_error(stderr)

        # Sample Output:
        # {
        # }

        try:
            result = json.loads(stdout)
            result = result
        except Exception:
            return self.parse_error('Could not parse: "%s"' % (stdout))

        parsed_output = {'tool': self.name}

        # TODO()
        return parsed_output

    @staticmethod
    def consolidate_results(results):
        # TODO()
        return {'Test': 'Test'}

    @staticmethod
    def consolidate_samples(results, vm_count):
        # TODO()
        return {'Test': 'Test'}
