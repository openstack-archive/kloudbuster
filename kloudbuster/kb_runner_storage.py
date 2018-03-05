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

class KBInitVolumeException(KBException):
    pass

class KBRunner_Storage(KBRunner):
    """
    Control the testing VMs on the testing cloud
    """

    def __init__(self, client_list, config):
        KBRunner.__init__(self, client_list, config, single_cloud=True)

    def header_formatter(self, stage, vm_count):
        rr_iops = rw_iops = sr_tp = sw_tp = 0
        for tc in self.config.storage_tool_configs:
            if tc.mode == 'randread':
                rr_iops = vm_count * tc.rate_iops
            if tc.mode == 'randwrite':
                rw_iops = vm_count * tc.rate_iops
            if tc.mode == 'read':
                sr_tp = tc.rate.upper()
                ex_unit = sr_tp[-1] if sr_tp[-1] in ['K', 'M', 'G', 'T'] else None
                sr_tp = (str(vm_count * int(sr_tp[:-1])) + ex_unit)\
                    if ex_unit else vm_count * int(sr_tp)
            if tc.mode == 'write':
                sw_tp = tc.rate.upper()
                ex_unit = sw_tp[-1] if sw_tp[-1] in ['K', 'M', 'G', 'T'] else None
                sw_tp = (str(vm_count * int(sw_tp[:-1])) + ex_unit)\
                    if ex_unit else vm_count * int(sw_tp)

        if rr_iops and rw_iops:
            iops_str = ', %d/%d(r/w) Expected IOPS' % (rr_iops, rw_iops)
        elif rr_iops:
            iops_str = ', %d Read Expected IOPS' % (rr_iops)
        elif rw_iops:
            iops_str = ', %d Write Expected IOPS' % (rw_iops)
        else:
            iops_str = ''

        if sr_tp and sw_tp:
            tp_str = ', %sB/%sB(r/w) Expected Throughput' % (sr_tp, sw_tp)
        elif sr_tp:
            tp_str = ', %sB Read Expected Throughput' % (sr_tp)
        elif sw_tp:
            tp_str = ', %sB Write Expected Throughput' % (sw_tp)
        else:
            tp_str = ''

        msg = "Stage %d: %d VM(s)%s%s" % (stage, vm_count, iops_str, tp_str)
        return msg

    def init_volume(self, active_range):
        # timeout is calculated as 30s/GB/client VM
        timeout = 60 * self.config.storage_stage_configs.io_file_size * len(self.client_dict)
        parameter = {'size': str(self.config.storage_stage_configs.io_file_size) + 'GiB'}
        parameter['mkfs'] = True \
            if self.config.storage_stage_configs.target == 'volume' else False

        func = {'cmd': 'init_volume', 'active_range': active_range,
                'parameter': parameter}
        self.send_cmd('EXEC', 'storage', func)
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBInitVolumeException()

    def run_storage_test(self, active_range, tool_config):
        func = {'cmd': 'run_storage_test', 'active_range': active_range,
                'parameter': tool_config}
        self.send_cmd('EXEC', 'storage', func)
        # Give additional 30 seconds for everybody to report results
        if tool_config['runtime']:
            timeout = tool_config['runtime'] + 30
        else:
            # 0 = unlimited, for now set max to 24 hours
            timeout = 60 * 60 * 24
        cnt_pending = self.polling_vms(timeout)[2]
        if cnt_pending:
            LOG.error("%d testing VM(s) not returning results within %d sec, "
                      "summary shown will be partial!" % (cnt_pending, timeout))
        else:
            # Parse the results from storage benchmarking tool
            for key, instance in self.client_dict.items():
                self.result[key] = instance.perf_client_parser(**self.result[key])
        return cnt_pending

    def single_run(self, active_range=None, test_only=False, run_label=None):
        try:
            if not test_only:
                if self.config.storage_stage_configs.target == 'volume':
                    LOG.info("Initializing volume and setting up filesystem...")
                else:
                    LOG.info("Initializing ephemeral disk...")
                self.init_volume(active_range)

                if self.config.prompt_before_run:
                    print "Press enter to start running benchmarking tools..."
                    raw_input()

            test_count = len(self.config.storage_tool_configs)
            perf_tool = self.client_dict.values()[0].perf_tool
            self.tool_result = []
            vm_count = active_range[1] - active_range[0] + 1\
                if active_range else len(self.full_client_dict)
            for idx, cur_config in enumerate(self.config.storage_tool_configs):
                LOG.info("Running test case %d of %d..." % (idx + 1, test_count))
                self.report = {'seq': 0, 'report': None}
                self.result = {}
                LOG.kbdebug(dict(cur_config))
                timeout_vms = self.run_storage_test(active_range, dict(cur_config))

                # Call the method in corresponding tools to consolidate results
                LOG.kbdebug(self.result.values())

                tc_result = perf_tool.consolidate_results(self.result.values())
                tc_result['description'] = cur_config['description']
                tc_result['mode'] = cur_config['mode']
                tc_result['block_size'] = cur_config['block_size']
                tc_result['iodepth'] = cur_config['iodepth']
                if tc_result['mode'] in ['randrw', 'rw']:
                    tc_result['rwmixread'] = cur_config['rwmixread']
                if 'rate_iops' in cur_config:
                    tc_result['rate_iops'] = vm_count * cur_config['rate_iops']
                if 'rate' in cur_config:
                    req_rate = cur_config['rate']
                    if req_rate:
                        ex_unit = 'KMG'.find(req_rate[-1].upper())
                        req_rate = vm_count * int(req_rate[:-1]) * (1024 ** (ex_unit))\
                            if ex_unit != -1 else vm_count * int(req_rate)
                    tc_result['rate'] = req_rate
                tc_result['total_client_vms'] = vm_count
                tc_result['timeout_vms'] = timeout_vms
                if run_label:
                    tc_result['run_label'] = run_label
                self.tool_result.append(tc_result)
                if timeout_vms:
                    return timeout_vms
            return 0

        except KBInitVolumeException:
            raise KBException("Could not initilize the volume.")

    def run(self, test_only=False, run_label=None):

        if self.config.progression.enabled:
            self.tool_result = {}
            tc_flag = True
            start = self.config.progression.vm_start
            multiple = self.config.progression.vm_multiple
            limit = self.config.progression.storage_stop_limit
            vm_list = self.full_client_dict.keys()
            vm_list.sort(cmp=lambda x, y: cmp(int(x[x.rfind('I') + 1:]), int(y[y.rfind('I') + 1:])))
            self.client_dict = {}
            cur_stage = 1

            while tc_flag:
                cur_vm_count = len(self.client_dict)
                if start == 1 and multiple != 1:
                    target_vm_count = 1 if cur_stage == 1 else (cur_stage - 1) * multiple
                else:
                    target_vm_count = cur_stage * multiple

                if target_vm_count > len(self.full_client_dict):
                    break

                for idx in xrange(cur_vm_count, target_vm_count):
                    self.client_dict[vm_list[idx]] = self.full_client_dict[vm_list[idx]]

                description = "-- %s --" % self.header_formatter(cur_stage, len(self.client_dict))
                LOG.info(description)
                timeout_vms = self.single_run(active_range=[0, target_vm_count - 1],
                                              test_only=test_only,
                                              run_label=run_label)
                LOG.info('-- Stage %s: %s --' % (cur_stage, str(self.tool_result)))
                cur_stage += 1

                if self.tool_result:
                    for idx, cur_tc in enumerate(self.config.storage_tool_configs):
                        req_iops = self.tool_result[idx].get('rate_iops', 0)
                        req_rate = self.tool_result[idx].get('rate', 0)
                        if cur_tc['mode'] in ['randread', 'read']:
                            cur_iops = int(self.tool_result[idx]['read_iops'])
                            cur_rate = int(self.tool_result[idx]['read_bw'])
                        else:
                            cur_iops = int(self.tool_result[idx]['write_iops'])
                            cur_rate = int(self.tool_result[idx]['write_bw'])

                        # some runs define an unlimited iops/bw in this case
                        # we never abort the iteration
                        if req_iops or req_rate:
                            degrade_iops = (req_iops - cur_iops) * 100 / req_iops if req_iops else 0
                            degrade_rate = (req_rate - cur_rate) * 100 / req_rate if req_rate else 0
                            if ((cur_tc['mode'] in ['randread', 'randwrite'] and
                                degrade_iops > limit)
                               or (cur_tc['mode'] in ['read', 'write'] and degrade_rate > limit)):
                                LOG.warning('KloudBuster is stopping the iteration '
                                            'because the result reaches the stop limit.')
                                tc_flag = False
                                break
                if timeout_vms:
                    LOG.warning('KloudBuster is stopping the iteration because of there are %d '
                                'VMs timing out' % timeout_vms)
                    tc_flag = False
                    break
                yield self.tool_result
        else:
            self.single_run(test_only=test_only, run_label=run_label)
            yield self.tool_result
