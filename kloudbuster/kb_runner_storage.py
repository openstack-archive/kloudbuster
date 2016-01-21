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

    def __init__(self, client_list, config, expected_agent_version):
        KBRunner.__init__(self, client_list, config, expected_agent_version, single_cloud=True)

    def init_volume(self, active_range, timeout=30):
        func = {'cmd': 'init_volume', 'active_range': active_range,
                'parameter': str(self.config.volume_size) + 'GB'}
        self.send_cmd('EXEC', 'storage', func)
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBInitVolumeException()

    def run_storage_test(self, active_range, tool_config):
        func = {'cmd': 'run_storage_test', 'active_range': active_range,
                'parameter': tool_config}
        self.send_cmd('EXEC', 'storage', func)
        # Give additional 30 seconds for everybody to report results
        timeout = tool_config['runtime'] + 30
        cnt_pending = self.polling_vms(timeout)[2]
        if cnt_pending != 0:
            LOG.warning("Testing VMs are not returning results within grace period, "
                        "summary shown below may not be accurate!")

        # Parse the results from storage benchmarking tool
        for key, instance in self.client_dict.items():
            self.result[key] = instance.perf_client_parser(**self.result[key])

    def single_run(self, active_range=None, test_only=False):
        try:
            if not test_only:
                LOG.info("Initilizing volume and setting up filesystem...")
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
                LOG.info("Runing test case %d of %d..." % (idx + 1, test_count))
                self.report = {'seq': 0, 'report': None}
                self.result = {}
                self.run_storage_test(active_range, dict(cur_config))
                # Call the method in corresponding tools to consolidate results
                LOG.kbdebug(self.result.values())
                tc_result = perf_tool.consolidate_results(self.result.values())
                tc_result['mode'] = cur_config['mode']
                tc_result['block_size'] = cur_config['block_size']
                tc_result['iodepth'] = cur_config['iodepth']
                if 'rate_iops' in cur_config:
                    tc_result['rate_iops'] = cur_config['rate_iops']
                if 'rate' in cur_config:
                    tc_result['rate'] = cur_config['rate']
                tc_result['total_client_vms'] = vm_count
                tc_result['total_server_vms'] = tc_result['total_client_vms']
                self.tool_result.append(tc_result)
        except KBInitVolumeException:
            raise KBException("Could not initilize the volume.")

    def run(self, test_only=False):
        if not test_only:
            # Resources are already staged, just re-run the storage benchmarking tool
            self.wait_for_vm_up()

        if self.config.progression.enabled:
            # TODO(Implement progression runs)
            pass
        else:
            self.single_run(test_only=test_only)
            yield self.tool_result
