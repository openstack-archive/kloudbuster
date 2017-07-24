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

from __future__ import division

from kb_runner_base import KBException
from kb_runner_base import KBRunner
import log as logging

LOG = logging.getLogger(__name__)

class KBSetStaticRouteException(KBException):
    pass

class KBHTTPServerUpException(KBException):
    pass

class KBHTTPBenchException(KBException):
    pass

class KBRunner_HTTP(KBRunner):
    """
    Control the testing VMs on the testing cloud
    """

    def __init__(self, client_list, config, single_cloud=True):
        KBRunner.__init__(self, client_list, config, single_cloud)

    def header_formatter(self, stage, vm_count):
        conns = vm_count * self.config.http_tool_configs.connections
        rate_limit = vm_count * self.config.http_tool_configs.rate_limit
        msg = "Stage %d: %d VM(s), %d Connections, %d Expected RPS" %\
              (stage, vm_count, conns, rate_limit)
        return msg

    def setup_static_route(self, active_range, timeout=30):
        func = {'cmd': 'setup_static_route', 'active_range': active_range}
        self.send_cmd('EXEC', 'http', func)
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBSetStaticRouteException()

    def check_http_service(self, active_range, timeout=30):
        func = {'cmd': 'check_http_service', 'active_range': active_range}
        self.send_cmd('EXEC', 'http', func)
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBHTTPServerUpException()

    def run_http_test(self, active_range):
        func = {'cmd': 'run_http_test', 'active_range': active_range,
                'parameter': dict(self.config.http_tool_configs)}
        self.send_cmd('EXEC', 'http', func)
        # Give additional 30 seconds for everybody to report results
        timeout = self.config.http_tool_configs.duration + 30
        cnt_pending = self.polling_vms(timeout)[2]
        if cnt_pending != 0:
            LOG.warning("Testing VMs are not returning results within grace period, "
                        "summary shown below may not be accurate!")

        # Parse the results from HTTP benchmarking tool
        for key, instance in self.client_dict.items():
            self.result[key] = instance.perf_client_parser(**self.result[key])

    def single_run(self, active_range=None, http_test_only=False):
        try:
            if not http_test_only:
                if self.single_cloud:
                    LOG.info("Setting up static route to reach tested cloud...")
                    self.setup_static_route(active_range)

                LOG.info("Waiting for HTTP service to come up...")
                self.check_http_service(active_range)

                if self.config.prompt_before_run:
                    print "Press enter to start running benchmarking tools..."
                    raw_input()

            LOG.info("Running HTTP Benchmarking...")
            self.report = {'seq': 0, 'report': None}
            self.result = {}
            self.run_http_test(active_range)

            # Call the method in corresponding tools to consolidate results
            perf_tool = self.client_dict.values()[0].perf_tool
            LOG.kbdebug(self.result.values())
            self.tool_result = perf_tool.consolidate_results(self.result.values())
            self.tool_result['http_rate_limit'] =\
                len(self.client_dict) * self.config.http_tool_configs.rate_limit
            self.tool_result['total_connections'] =\
                len(self.client_dict) * self.config.http_tool_configs.connections
            vm_count = active_range[1] - active_range[0] + 1\
                if active_range else len(self.full_client_dict)
            self.tool_result['total_client_vms'] = vm_count
            self.tool_result['total_server_vms'] = self.tool_result['total_client_vms']
            # self.tool_result['host_stats'] = self.gen_host_stats()
        except KBSetStaticRouteException:
            raise KBException("Could not set static route.")
        except KBHTTPServerUpException:
            raise KBException("HTTP service is not up in testing cloud.")
        except KBHTTPBenchException:
            raise KBException("Error while running HTTP benchmarking tool.")

    def run(self, test_only=False):
        if not test_only:
            # Resources are already staged, just re-run the HTTP benchmarking tool
            self.wait_for_vm_up()

        if self.config.progression.enabled:
            self.tool_result = {}
            start = self.config.progression.vm_start
            multiple = self.config.progression.vm_multiple
            limit = self.config.progression.http_stop_limit
            timeout = self.config.http_tool_configs.timeout
            vm_list = self.full_client_dict.keys()
            vm_list.sort(cmp=lambda x, y: cmp(int(x[x.rfind('I') + 1:]), int(y[y.rfind('I') + 1:])))
            self.client_dict = {}
            cur_stage = 1

            while True:
                cur_vm_count = len(self.client_dict)
                if start == 1:
                    target_vm_count = 1 if cur_stage == 1 else (cur_stage - 1) * multiple
                else:
                    target_vm_count = cur_stage * multiple
                timeout_at_percentile = 0
                if target_vm_count > len(self.full_client_dict):
                    break
                if self.tool_result and 'latency_stats' in self.tool_result:
                    err = self.tool_result['http_sock_err'] + self.tool_result['http_sock_timeout']
                    pert_dict = dict(self.tool_result['latency_stats'])
                    if limit[1] in pert_dict.keys():
                        timeout_at_percentile = pert_dict[limit[1]] // 1000000
                    elif limit[1] != 0:
                        LOG.warning('Percentile %s%% is not a standard statistic point.' % limit[1])
                    if err > limit[0] or timeout_at_percentile > timeout:
                        LOG.warning('KloudBuster is stopping the iteration because the result '
                                    'reaches the stop limit.')
                        break

                for idx in xrange(cur_vm_count, target_vm_count):
                    self.client_dict[vm_list[idx]] = self.full_client_dict[vm_list[idx]]
                description = "-- %s --" % self.header_formatter(cur_stage, len(self.client_dict))
                LOG.info(description)
                self.single_run(active_range=[0, target_vm_count - 1],
                                http_test_only=test_only)
                LOG.info('-- Stage %s: %s --' % (cur_stage, str(self.tool_result)))
                self.tool_result['description'] = description
                cur_stage += 1
                yield self.tool_result
        else:
            self.single_run(http_test_only=test_only)
            yield self.tool_result
