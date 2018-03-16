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

from hdrh.histogram import HdrHistogram


def assign_dict(dest, key, value, cond_key=None):
    if not cond_key or cond_key in dest:
        if value:
            dest[key] = value

class FioTool(PerfTool):

    def __init__(self, instance):
        PerfTool.__init__(self, instance, 'fio')

    def cmd_parser_run_client(self, status, stdout, stderr):
        if status:
            return self.parse_error(stderr)

        # Sample Output:
        # Refer to kloudbuster/fio_example.json for a sample output
        parsed_output = {'tool': self.name}
        try:
            result = json.loads(stdout)
            assign_dict(parsed_output, 'tool', result['fio version'])

            job = result['jobs'][0]

            assign_dict(parsed_output, 'read_iops', job['read']['iops'])
            assign_dict(parsed_output, 'read_bw', job['read']['bw'])
            assign_dict(parsed_output, 'read_runtime_ms', job['read']['runtime'])
            assign_dict(parsed_output, 'read_KB', job['read']['io_bytes'])
            assign_dict(parsed_output, 'read_hist', job['read']['clat']['hist'], 'read_bw')

            assign_dict(parsed_output, 'write_iops', job['write']['iops'])
            assign_dict(parsed_output, 'write_bw', job['write']['bw'])
            assign_dict(parsed_output, 'write_runtime_ms', job['write']['runtime'])
            assign_dict(parsed_output, 'write_KB', job['write']['io_bytes'])
            assign_dict(parsed_output, 'write_hist', job['write']['clat']['hist'], 'write_bw')

            assign_dict(parsed_output, 'cpu', {'usr': job['usr_cpu'], 'sys': job['sys_cpu']})

        except Exception:
            return self.parse_error('Could not parse: "%s"' % (stdout))
        return parsed_output

    @staticmethod
    def consolidate_results(results):
        total_count = len(results)
        if not total_count:
            return {'tool': 'fio'}

        all_res = {}
        for key in ['read_iops', 'read_bw', 'write_iops', 'write_bw',
                    'read_runtime_ms', 'write_runtime_ms',
                    'read_KB', 'write_KB']:
            total = 0
            for item in results:
                total += item['results'].get(key, 0)
            if total:
                all_res[key] = int(total)
        all_res['tool'] = results[0]['results']['tool']

        all_cpus = []
        for item in results:
            all_cpus.append(item['results'].get('cpu', None))
        if all_cpus:
            all_res['cpu'] = all_cpus

        clat_list = []
        # perc_list = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 99.5, 99.9, 99.95, 99.99]
        perc_list = [50, 75, 90, 99, 99.9, 99.99, 99.999]
        if 'read_hist' in results[0]['results']:
            clat_list.append('read_hist')
        if 'write_hist' in results[0]['results']:
            clat_list.append('write_hist')

        for clat in clat_list:
            all_res[clat] = []
            histogram = HdrHistogram(1, 5 * 3600 * 1000, 3)
            for item in results:
                histogram.decode_and_add(item['results'][clat])

            latency_dict = histogram.get_percentile_to_value_dict(perc_list)
            for key, value in latency_dict.iteritems():
                all_res[clat].append([key, value])
            all_res[clat].sort()

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
