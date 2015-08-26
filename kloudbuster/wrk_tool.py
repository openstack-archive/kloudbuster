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

    def __init__(self, instance, cfg_http_tool):
        PerfTool.__init__(self, instance, cfg_http_tool)

    def cmd_run_client(self, target_url, threads, connections,
                       rate_limit=0, timeout=5, connetion_type='Keep-alive'):
        '''
        Return the command for running the benchmarking tool
        '''
        duration_sec = self.instance.config.http_tool_configs.duration
        if not rate_limit:
            rate_limit = 65535
        cmd = '%s -t%d -c%d -R%d -d%ds --timeout %ds -D2 -e %s' % \
            (self.dest_path, threads, connections, rate_limit,
             duration_sec, timeout, target_url)
        LOG.kbdebug("[%s] %s" % (self.instance.vm_name, cmd))
        return cmd

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

        return self.parse_results(http_total_req=http_total_req,
                                  http_rps=http_rps,
                                  http_tp_kbytes=http_tp_kbytes,
                                  http_sock_err=http_sock_err,
                                  http_sock_timeout=http_sock_timeout,
                                  http_err=http_err,
                                  latency_stats=latency_stats)

    @staticmethod
    def consolidate_results(results):
        all_res = {'tool': 'wrk2'}
        total_count = len(results)
        if not total_count:
            return all_res

        for key in ['http_rps', 'http_total_req', 'http_sock_err',
                    'http_sock_timeout', 'http_throughput_kbytes']:
            all_res[key] = 0
            for item in results:
                if (key in item['results']):
                    all_res[key] += item['results'][key]
            all_res[key] = int(all_res[key])

        if 'latency_stats' in results[0]['results']:
            # for item in results:
            #     print item['results']['latency_stats']
            all_res['latency_stats'] = []
            histogram = HdrHistogram(1, 24 * 3600 * 1000 * 1000, 2)
            for item in results:
                histogram.decode_and_add(item['results']['latency_stats'])
            perc_list = [50, 75, 90, 99, 99.9, 99.99, 99.999]
            latency_dict = histogram.get_percentile_to_value_dict(perc_list)
            for key, value in latency_dict.iteritems():
                all_res['latency_stats'].append([key, value])
            all_res['latency_stats'].sort()

        return all_res

    @staticmethod
    def consolidate_samples(results, vm_count):
        all_res = WrkTool.consolidate_results(results)
        total_count = len(results)
        if not total_count:
            return all_res

        all_res['http_rps'] = all_res['http_rps'] / total_count * vm_count
        all_res['http_throughput_kbytes'] = all_res['http_throughput_kbytes'] / total_count
        return all_res
