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

from __future__ import division

from kb_runner_base import KBException
from kb_runner_base import KBRunner
import log as logging
LOG = logging.getLogger(__name__)

class KBMulticastServerUpException(KBException):
    pass

class KBMulticastBenchException(KBException):
    pass

class KBRunner_Multicast(KBRunner):
    """
    Control the testing VMs on the testing cloud
    """

    def __init__(self, client_list, config, single_cloud=True):
        KBRunner.__init__(self, client_list, config, single_cloud)

    def header_formatter(self, stage, nTests, nReceiver, pktsize):
        msg = "Stage %d/%d: %d Receiver(s) with a Packet Size of %dkb" %\
              (stage, nTests, nReceiver, pktsize)
        return msg

    def setup_static_route(self, active_range, timeout=30):
        func = {'cmd': 'setup_static_route', 'active_range': active_range}
        self.send_cmd('EXEC', 'multicast', func)
        self.polling_vms(timeout)[0]

    def check_multicast_service(self, active_range, timeout=30):
        func = {'cmd': 'check_multicast_service', 'active_range': active_range}
        self.send_cmd('EXEC', 'multicast', func)
        self.polling_vms(timeout)[0]

    def run_multicast_test(self, active_range, opts, timeout):
        func = {'cmd': 'run_multicast_test', 'active_range': active_range,
                'parameter': opts}
        self.send_cmd('EXEC', 'multicast', func)
        status = self.polling_vms(timeout)
        if status[2] != 0:
            LOG.warning("Testing VMs are not returning results within grace period, "
                        "summary shown below may not be accurate!")


    @staticmethod
    def json_to_csv(jsn):
        csv = "Test,receivers,addresses,ports,bitrate,pkt_size,"
        firstKey = [x for x in jsn.keys()][0]
        keys = jsn[firstKey].keys()
        csv += ",".join(keys) + "\r\n"
        for obj_k in jsn.keys():
            obj = jsn[obj_k]
            obj_vals = map(str, obj.values())
            csv += '"' + obj_k + '"' + "," + obj_k + "," + ",".join(obj_vals) + "\r\n"
        return csv

    def single_run(self, active_range=None, multicast_test_only=False, opts={}, timeout=500):
        try:
            if not multicast_test_only:
                if self.single_cloud:
                    LOG.info("Setting up static route to reach tested cloud...")
                    self.setup_static_route(active_range)

                LOG.info("Waiting for multicast service to come up...")
                self.check_multicast_service(active_range)

                if self.config.prompt_before_run:
                    print "Press enter to start running benchmarking tools..."
                    raw_input()

            LOG.info("Running Multicast Benchmarking...")
            self.report = {'seq': 0, 'report': None}
            self.result = {}
            self.run_multicast_test(active_range, opts, timeout)

            # Call the method in corresponding tools to consolidate results
            LOG.kbdebug(self.result)

            self.tool_result.update(self.result)
        except KBMulticastServerUpException:
            raise KBException("multicast service is not up in testing cloud.")
        except KBMulticastBenchException:
            raise KBException("Error while running multicast benchmarking tool.")

    def run(self, test_only=False):
        if not test_only:
            # Resources are already staged, just re-run the multicast benchmarking tool
            self.wait_for_vm_up()

        self.tool_result = {}
        vm_list = self.full_client_dict.keys()
        vm_list.sort(cmp=lambda x, y: cmp(int(x[x.rfind('I') + 1:]), int(y[y.rfind('I') + 1:])))
        self.client_dict = {}
        cur_stage = 1

        duration = self.config.multicast_tool_configs.duration
        receivers = self.config.multicast_tool_configs.receivers
        pktsizes = self.config.multicast_tool_configs.pktsizes
        bitrates = self.config.multicast_tool_configs.bitrates
        address_test_pattern = self.config.multicast_tool_configs.address_test_pattern
        port_test_pattern = self.config.multicast_tool_configs.port_test_pattern
        multicast_address_start = self.config.multicast_tool_configs.multicast_address_start
        server_address = self.config.multicast_tool_configs.external_sender
        server_port = self.config.multicast_tool_configs.external_sender_port

        timeo = len(bitrates) * len(address_test_pattern) * len(port_test_pattern) * duration + 300
        nTests = len(receivers) * len(pktsizes)


        if not self.config.multicast_tool_configs.external_sender_test_mode:
            server_address = "0.0.0.0"
            server_port = 5000

        for nReceiver in receivers:
            for idx in range(0, nReceiver):
                self.client_dict[vm_list[0]] = self.full_client_dict[vm_list[0]]

            if nReceiver > 1:
                # Tests with multiple listeners listen on the second /25.
                b = multicast_address_start.split(".")
                b[-1] = str(128)
                multicast_address_start = ".".join(b)

            LOG.info("Starting Multicast Tests")
            for pktsize in pktsizes:
                desc = "-- %s --" % self.header_formatter(cur_stage, nTests, nReceiver, pktsize)
                LOG.info(desc)
                opts = {"address_pattern": address_test_pattern, 'server_port': server_port,
                        'receivers': nReceiver, "bitrates": bitrates,
                        "multicast_address_start": multicast_address_start, "pktsize": pktsize,
                        'duration': duration, 'server_address': server_address,
                        "port_pattern": port_test_pattern}
                self.single_run(active_range=[0, nReceiver],
                                multicast_test_only=True,
                                opts=opts,
                                timeout=timeo
                                )
                cur_stage += 1
            yield self.tool_result
