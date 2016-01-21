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

import json

from perf_tool import PerfTool

from hdrh.histogram import HdrHistogram
import log as logging

LOG = logging.getLogger(__name__)


class WrkTool(PerfTool):

    def __init__(self, instance):
        PerfTool.__init__(self, instance, 'wrk2')

    def cmd_parser_run_client(self, status, stdout, stderr):
        if status:
            return self.parse_error(stderr)

        # Sample Output:
        # {
        # "total_req": 29, "rps": 29.39, "rx_bps": "1.43MB",
        # "hist": "HISTggAAANB4nO3XsQ3DIBAAQFBWcJnskc6reJMokjfIcF7DI9iS3bkIFBg"
        #         "k7iRE8wU88Hqe8+8b4ucdDo9zjvsYXssUxjUAAAAAAAAAAAAAAAAAAAAAAA"
        #         "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        #         "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQKpYKS5V6+sDAACu7u7P/Rvq"
        #         "kKe65L9tuefTaj2EnngXdeXWr1L17l98r/ek1323plR/ETdacAUk"
        # "errors": {"read": 1},
        # }

        try:
            result = json.loads(stdout)
            http_total_req = int(result['total_req'])
            http_rps = float(result['rps'])
            http_tp_kbytes = result['rx_bps']
            # Uniform in unit MB
            ex_unit = 'KMG'.find(http_tp_kbytes[-2])
            if ex_unit == -1:
                raise ValueError
            val = float(http_tp_kbytes[0:-2])
            http_tp_kbytes = float(val * (1024 ** (ex_unit)))

            if 'errors' in result:
                errs = []
                for key in ['connect', 'read', 'write', 'timeout', 'http_error']:
                    if key in result['errors']:
                        errs.append(int(result['errors'][key]))
                    else:
                        errs.append(0)
                http_sock_err = errs[0] + errs[1] + errs[2]
                http_sock_timeout = errs[3]
                http_err = errs[4]
            else:
                http_sock_err = 0
                http_sock_timeout = 0
                http_err = 0

            latency_stats = result['hist']
        except Exception:
            return self.parse_error('Could not parse: "%s"' % (stdout))

        parsed_output = {'tool': self.name}
        if http_total_req:
            parsed_output['http_total_req'] = http_total_req
        if http_rps:
            parsed_output['http_rps'] = http_rps
        if http_tp_kbytes:
            parsed_output['http_throughput_kbytes'] = http_tp_kbytes
        if http_sock_err:
            parsed_output['http_sock_err'] = http_sock_err
        if http_sock_timeout:
            parsed_output['http_sock_timeout'] = http_sock_timeout
        if http_err:
            parsed_output['http_err'] = http_err
        if latency_stats:
            parsed_output['latency_stats'] = latency_stats

        return parsed_output

    @staticmethod
    def consolidate_results(results):
        err_flag = False
        all_res = {'tool': 'wrk2'}
        total_count = len(results)
        if not total_count:
            return all_res

        for key in ['http_rps', 'http_total_req', 'http_sock_err',
                    'http_sock_timeout', 'http_throughput_kbytes']:
            all_res[key] = 0
            for item in results:
                all_res[key] += item['results'].get(key, 0)
            all_res[key] = int(all_res[key])

        if 'latency_stats' in results[0]['results']:
            # for item in results:
            #     print item['results']['latency_stats']
            all_res['latency_stats'] = []
            histogram = HdrHistogram(1, 24 * 3600 * 1000 * 1000, 2)
            for item in results:
                if 'latency_stats' in item['results']:
                    histogram.decode_and_add(item['results']['latency_stats'])
                else:
                    err_flag = True
            perc_list = [50, 75, 90, 99, 99.9, 99.99, 99.999]
            latency_dict = histogram.get_percentile_to_value_dict(perc_list)
            for key, value in latency_dict.iteritems():
                all_res['latency_stats'].append([key, value])
            all_res['latency_stats'].sort()

        if err_flag:
            LOG.warning('Unable to find latency_stats from the result dictionary, this '
                        'may indicate that the test application on VM exited abnormally.')

        return all_res

    @staticmethod
    def consolidate_samples(results, vm_count):
        all_res = WrkTool.consolidate_results(results)
        total_count = float(len(results)) / vm_count
        if not total_count:
            return all_res

        all_res['http_rps'] = int(all_res['http_rps'] / total_count)
        all_res['http_throughput_kbytes'] = int(all_res['http_throughput_kbytes'] / total_count)
        return all_res
