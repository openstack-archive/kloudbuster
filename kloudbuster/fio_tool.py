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
        # Refer to kloudbuster/fio_example.json for a sample output

        try:
            result = json.loads(stdout)
            read_iops = result['jobs'][0]['read']['iops']
            read_bw = result['jobs'][0]['read']['bw']
            write_iops = result['jobs'][0]['write']['iops']
            write_bw = result['jobs'][0]['write']['bw']
        except Exception:
            return self.parse_error('Could not parse: "%s"' % (stdout))

        parsed_output = {'tool': self.name}
        if read_iops:
            parsed_output['read_iops'] = read_iops
        if read_bw:
            parsed_output['read_bw'] = read_bw
        if write_iops:
            parsed_output['write_iops'] = write_iops
        if write_bw:
            parsed_output['write_bw'] = write_bw

        return parsed_output

    @staticmethod
    def consolidate_results(results):
        all_res = {'tool': 'fio'}
        total_count = len(results)
        if not total_count:
            return all_res

        for key in ['read_iops', 'read_bw', 'write_iops', 'write_bw']:
            all_res[key] = 0
            for item in results:
                all_res[key] += item['results'].get(key, 0)
            all_res[key] = int(all_res[key])

        return all_res

    @staticmethod
    def consolidate_samples(results, vm_count):
        all_res = FioTool.consolidate_results(results)
        total_count = float(len(results)) / vm_count
        if not total_count:
            return all_res

        all_res['read_iops'] = int(all_res['read_iops'] / total_count)
        all_res['write_iops'] = int(all_res['write_iops'] / total_count)
        return all_res
