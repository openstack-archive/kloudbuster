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

from base_compute import BaseCompute
from fio_tool import FioTool
from nuttcp_tool import NuttcpTool
from wrk_tool import WrkTool


# An openstack instance (can be a VM or a LXC)
class PerfInstance(BaseCompute):

    def __init__(self, vm_name, network, config):
        BaseCompute.__init__(self, vm_name, network)

        self.config = config
        self.boot_info = {}
        self.user_data = {}
        self.up_flag = False

        # SSH Configuration
        self.ssh_access = None
        self.ssh = None
        self.az = None

        self.storage_mode = network.router.user.tenant.kloud.storage_mode
        self.multicast_mode = network.router.user.tenant.kloud.multicast_mode
        if self.multicast_mode:
            self.perf_tool = NuttcpTool(self)
        else:
            self.perf_tool = FioTool(self) if self.storage_mode else WrkTool(self)

    def perf_client_parser(self, status, stdout, stderr):
        res = {'vm_name': self.vm_name}
        perf_tool_res = self.perf_tool.cmd_parser_run_client(status, stdout, stderr)
        if not self.storage_mode:
            res['target_url'] = self.target_url
            res['ip_from'] = self.ssh_ip

        # consolidate results for all tools
        res['results'] = perf_tool_res
        return res

    # Send a command on the ssh session
    def exec_command(self, cmd, timeout=30):
        (status, cmd_output, err) = self.ssh.execute(cmd, timeout=timeout)
        return (status, cmd_output, err)

    # Dispose the ssh session
    def dispose(self):
        if self.ssh:
            self.ssh.close()
            self.ssh = None
