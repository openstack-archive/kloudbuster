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
            read_clat = result['jobs'][0]['read']['clat']['bins']
            write_clat = result['jobs'][0]['write']['clat']['bins']
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
        if read_bw and read_clat:
            parsed_output['read_clat'] = read_clat
        if write_bw and write_clat:
            parsed_output['write_clat'] = write_clat

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

        clat_list = []
        # perc_list = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 99.5, 99.9, 99.95, 99.99]
        perc_list = [50, 75, 90, 99, 99.9, 99.99, 99.999]
        if 'read_clat' in results[0]['results']:
            clat_list.append('read_clat')
        if 'write_clat' in results[0]['results']:
            clat_list.append('write_clat')

        for clat in clat_list:
            total_buckets = results[0]['results'][clat]['FIO_IO_U_PLAT_NR']
            grp_msb_bits = results[0]['results'][clat]['FIO_IO_U_PLAT_BITS']
            buckets_per_grp = results[0]['results'][clat]['FIO_IO_U_PLAT_VAL']

            d_bins = {}
            total_count = cur_count = cur_bucket = 0
            all_res[clat] = []
            for item in results:
                for bucket in xrange(total_buckets):
                    d_bins[bucket] = d_bins.get(bucket, 0) + item['results'][clat][str(bucket)]
                    total_count += item['results'][clat][str(bucket)]

            for perc in perc_list:
                count_at_perc = float(perc) * total_count / 100
                while cur_count < count_at_perc and cur_bucket < total_buckets:
                    cur_count += d_bins[cur_bucket]
                    cur_bucket += 1

                grp = cur_bucket / buckets_per_grp
                subbucket = cur_bucket % buckets_per_grp
                if grp == 0:
                    val = subbucket - 1
                else:
                    base = 2 ** (grp_msb_bits + grp - 1)
                    val = int(base + (base / buckets_per_grp) * (subbucket - 0.5))

                all_res[clat].append([perc, val])

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
