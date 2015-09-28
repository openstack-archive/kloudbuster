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
from collections import deque
from distutils.version import LooseVersion
import threading
import time

import log as logging
import redis

# A set of warned VM version mismatches
vm_version_mismatches = set()

LOG = logging.getLogger(__name__)

class KBException(Exception):
    pass

class KBVMUpException(KBException):
    pass

class KBSetStaticRouteException(KBException):
    pass

class KBHTTPServerUpException(KBException):
    pass

class KBHTTPBenchException(KBException):
    pass

class KBProxyConnectionException(KBException):
    pass

class KBRunner(object):
    """
    Control the testing VMs on the testing cloud
    """

    def __init__(self, client_list, config, expected_agent_version, single_cloud=True):
        self.full_client_dict = dict(zip([x.vm_name for x in client_list], client_list))
        self.client_dict = self.full_client_dict
        self.config = config
        self.single_cloud = single_cloud
        self.result = {}
        self.host_stats = {}
        self.tool_result = {}
        self.expected_agent_version = expected_agent_version
        self.agent_version = None
        self.report = {'seq': 0, 'report': None}

        # Redis
        self.redis_obj = None
        self.pubsub = None
        self.orches_chan_name = "kloudbuster_orches"
        self.report_chan_name = "kloudbuster_report"
        self.message_queue = deque()

    def header_formatter(self, stage, vm_count):
        conns = vm_count * self.config.http_tool_configs.connections
        rate_limit = vm_count * self.config.http_tool_configs.rate_limit
        msg = "Stage %d: %d VM(s), %d Connections, %d Expected RPS" %\
              (stage, vm_count, conns, rate_limit)
        return msg

    def msg_handler(self):
        for message in self.pubsub.listen():
            if message['data'] == "STOP":
                break
            LOG.kbdebug(message)
            self.message_queue.append(message)

    def setup_redis(self, redis_server, redis_server_port=6379, timeout=120):
        LOG.info("Setting up the redis connections...")
        connection_pool = redis.ConnectionPool(
            host=redis_server, port=redis_server_port, db=0)

        self.redis_obj = redis.StrictRedis(connection_pool=connection_pool,
                                           socket_connect_timeout=1,
                                           socket_timeout=1)
        success = False
        retry_count = max(timeout // self.config.polling_interval, 1)
        # Check for connections to redis server
        for retry in xrange(retry_count):
            try:
                self.redis_obj.get("test")
                success = True
            except (redis.exceptions.ConnectionError):
                LOG.info("Connecting to redis server... Retry #%d/%d", retry, retry_count)
                time.sleep(self.config.polling_interval)
                continue
            break
        if not success:
            LOG.error("Error: Cannot connect to the Redis server")
            raise KBProxyConnectionException()

        # Subscribe to message channel
        self.pubsub = self.redis_obj.pubsub(ignore_subscribe_messages=True)
        self.pubsub.subscribe(self.report_chan_name)
        self.msg_thread = threading.Thread(target=self.msg_handler)
        self.msg_thread.daemon = True
        self.msg_thread.start()

    def dispose(self):
        self.redis_obj.publish(self.report_chan_name, "STOP")
        if self.msg_thread.isAlive():
            self.msg_thread.join()
        if self.pubsub:
            self.pubsub.unsubscribe()
            self.pubsub.close()

    def send_cmd(self, cmd, client_type, data):
        message = {'cmd': cmd, 'sender-id': 'kb-master',
                   'client-type': client_type, 'data': data}
        LOG.kbdebug(message)
        self.redis_obj.publish(self.orches_chan_name, message)

    def polling_vms(self, timeout, polling_interval=None):
        '''
        Polling all VMs for the status of execution
        Guarantee to run once if the timeout is less than polling_interval
        '''
        if not polling_interval:
            polling_interval = self.config.polling_interval
        retry_count = max(timeout // polling_interval, 1)
        retry = cnt_succ = cnt_failed = 0
        clist = self.client_dict.copy()
        samples = []
        http_tool = self.client_dict.values()[0].http_tool

        while (retry < retry_count and len(clist)):
            time.sleep(polling_interval)
            sample_count = 0
            while True:
                try:
                    msg = self.message_queue.popleft()
                except IndexError:
                    # No new message, commands are in executing
                    break

                payload = eval(msg['data'])
                vm_name = payload['sender-id']
                cmd = payload['cmd']
                if cmd == 'READY':
                    # If a READY packet is received, the corresponding VM is up
                    # running. We mark the flag for that VM, and skip all READY
                    # messages received afterwards.
                    instance = self.full_client_dict[vm_name]
                    if instance.up_flag:
                        continue
                    else:
                        clist[vm_name].up_flag = True
                        clist.pop(vm_name)
                        cnt_succ = cnt_succ + 1
                        self.agent_version = payload['data']
                elif cmd == 'REPORT':
                    sample_count = sample_count + 1
                    # Parse the results from HTTP Tools
                    instance = self.client_dict[vm_name]
                    self.result[vm_name] = instance.http_client_parser(**payload['data'])
                    samples.append(self.result[vm_name])
                elif cmd == 'DONE':
                    self.result[vm_name] = payload['data']
                    clist.pop(vm_name)
                    if self.result[vm_name]['status']:
                        # Command returned with non-zero status, command failed
                        LOG.error("[%s] %s", vm_name, self.result[vm_name]['stderr'])
                        cnt_failed = cnt_failed + 1
                    else:
                        # Command returned with zero, command succeed
                        cnt_succ = cnt_succ + 1
                elif cmd == 'DEBUG':
                    LOG.info('[%s] %s' + (vm_name, payload['data']))
                else:
                    LOG.error('[%s] received invalid command: %s' + (vm_name, cmd))

            log_msg = "%d Succeed, %d Failed, %d Pending... Retry #%d" %\
                      (cnt_succ, cnt_failed, len(clist), retry)
            if sample_count != 0:
                log_msg += " (%d sample(s) received)" % sample_count
            LOG.info(log_msg)

            if sample_count != 0:
                report = http_tool.consolidate_samples(samples, len(self.client_dict))
                self.report['seq'] = self.report['seq'] + 1
                self.report['report'] = report
                LOG.info('Periodical report: %s.' % str(self.report))
                samples = []
            retry = retry + 1

        return (cnt_succ, cnt_failed, len(clist))

    def wait_for_vm_up(self, timeout=300):
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBVMUpException()
        self.send_cmd('ACK', None, None)

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
            LOG.warn("Testing VMs are not returning results within grace period, "
                     "summary shown below may not be accurate!")

        # Parse the results from HTTP Tools
        for key, instance in self.client_dict.items():
            self.result[key] = instance.http_client_parser(**self.result[key])

    def gen_host_stats(self):
        self.host_stats = {}
        for vm in self.result.keys():
            phy_host = self.client_dict[vm].host
            if phy_host not in self.host_stats:
                self.host_stats[phy_host] = []
            self.host_stats[phy_host].append(self.result[vm])

        http_tool = self.client_dict.values()[0].http_tool
        for phy_host in self.host_stats:
            self.host_stats[phy_host] = http_tool.consolidate_results(self.host_stats[phy_host])

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
            self.run_http_test(active_range)

            # Call the method in corresponding tools to consolidate results
            http_tool = self.client_dict.values()[0].http_tool
            LOG.kbdebug(self.result.values())
            self.tool_result = http_tool.consolidate_results(self.result.values())
            self.tool_result['http_rate_limit'] =\
                len(self.client_dict) * self.config.http_tool_configs.rate_limit
            self.tool_result['total_connections'] =\
                len(self.client_dict) * self.config.http_tool_configs.connections
            self.tool_result['total_client_vms'] = len(self.full_client_dict)
            self.tool_result['total_server_vms'] = len(self.full_client_dict)
            # self.tool_result['host_stats'] = self.gen_host_stats()
        except KBSetStaticRouteException:
            raise KBException("Could not set static route.")
        except KBHTTPServerUpException:
            raise KBException("HTTP service is not up in testing cloud.")
        except KBHTTPBenchException:
            raise KBException("Error while running HTTP benchmarking tool.")

    def run(self, http_test_only=False):
        # Resources are already staged, just re-run the HTTP benchmarking tool
        if http_test_only:
            self.single_run(http_test_only=True)
            yield self.tool_result
            return

        try:
            LOG.info("Waiting for agents on VMs to come up...")
            self.wait_for_vm_up()
            if not self.agent_version:
                self.agent_version = "0"
            if (LooseVersion(self.agent_version) != LooseVersion(self.expected_agent_version)):
                # only warn once for each unexpected VM version
                if self.expected_agent_version not in vm_version_mismatches:
                    vm_version_mismatches.add(self.expected_agent_version)
                    LOG.warn("The VM image you are running (%s) is not the expected version (%s) "
                             "this may cause some incompatibilities" %
                             (self.agent_version, self.expected_agent_version))
        except KBVMUpException:
            raise KBException("Some VMs failed to start.")

        if self.config.progression.enabled:
            start = self.config.progression.vm_start
            step = self.config.progression.vm_step
            limit = self.config.progression.stop_limit
            timeout = self.config.http_tool_configs.timeout
            vm_list = self.full_client_dict.keys()
            vm_list.sort()

            self.client_dict = {}
            cur_stage = 1

            while True:
                cur_vm_count = len(self.client_dict)
                target_vm_count = start + (cur_stage - 1) * step
                if target_vm_count > len(self.full_client_dict):
                    break
                if self.tool_result:
                    err = self.tool_result['http_sock_err'] / self.tool_result['http_total_req']
                    pert_dict = dict(self.tool_result['latency_stats'])
                    if limit[1] in pert_dict.keys():
                        timeout_at_percentile = pert_dict[limit[1]] // 1000000
                    else:
                        timeout_at_percentile = 0
                        LOG.warn('Percentile %s%% is not a standard statistic point.' % limit[1])
                    if err > limit[0] or timeout_at_percentile > timeout:
                        LOG.warn('KloudBuster is stopping the iteration because the result '
                                 'reaches the stop limit.')
                        break

                for idx in xrange(cur_vm_count, target_vm_count):
                    self.client_dict[vm_list[idx]] = self.full_client_dict[vm_list[idx]]
                description = "-- %s --" % self.header_formatter(cur_stage, len(self.client_dict))
                LOG.info(description)
                if not self.single_run(active_range=[0, target_vm_count - 1]):
                    break
                LOG.info('-- Stage %s: %s --' % (cur_stage, str(self.tool_result)))
                self.tool_result['description'] = description
                cur_stage += 1
                yield self.tool_result
        else:
            self.single_run()
            yield self.tool_result
