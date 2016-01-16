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
                'parameter': str(self.config.volume_size) + 'G'}
        self.send_cmd('EXEC', 'storage', func)
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBInitVolumeException()

    def run_storage_test(self, active_range):
        func = {'cmd': 'run_storage_test', 'active_range': active_range,
                'parameter': dict(self.config.storage_tool_configs)}
        self.send_cmd('EXEC', 'storage', func)
        # Give additional 30 seconds for everybody to report results
        timeout = self.config.storage_tool_configs.runtime + 30
        cnt_pending = self.polling_vms(timeout)[2]
        if cnt_pending != 0:
            LOG.warn("Testing VMs are not returning results within grace period, "
                     "summary shown below may not be accurate!")

        # Parse the results from storage benchmarking tool
        for key, instance in self.client_dict.items():
            self.result[key] = instance.storage_client_parser(**self.result[key])

    def single_run(self, active_range=None, test_only=False):
        try:
            if not test_only:
                LOG.info("Initilizing volume and setting up filesystem...")
                self.init_volume(active_range)

                if self.config.prompt_before_run:
                    print "Press enter to start running benchmarking tools..."
                    raw_input()

            LOG.info("Running Storage Benchmarking...")
            self.report = {'seq': 0, 'report': None}
            self.result = {}
            # self.run_storage_test(active_range)

            # Call the method in corresponding tools to consolidate results
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
