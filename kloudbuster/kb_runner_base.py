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
import abc
from collections import deque
import json
import log as logging
import redis
import sys
import threading
import time

# A set of warned VM version mismatches
vm_version_mismatches = set()

LOG = logging.getLogger(__name__)

class KBException(Exception):
    pass

class KBVMUpException(KBException):
    pass

class KBProxyConnectionException(KBException):
    pass

class KBRunner(object):
    """
    Control the testing VMs on the testing cloud
    """

    def __init__(self, client_list, config, single_cloud=True):
        self.full_client_dict = dict(zip([x.vm_name for x in client_list], client_list))
        self.client_dict = self.full_client_dict
        self.config = config
        self.single_cloud = single_cloud
        self.result = {}
        self.host_stats = {}
        self.tool_result = {}
        self.agent_version = None
        self.report = None

        # Redis
        self.redis_obj = None
        self.pubsub = None
        self.orches_chan_name = "kloudbuster_orches"
        self.report_chan_name = "kloudbuster_report"
        self.message_queue = deque()

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
                # clear active exception to avoid the exception summary
                # appended to LOG.info by oslo log
                sys.exc_clear()
                LOG.info("Connecting to redis server... Retry #%d/%d", retry, retry_count)
                time.sleep(self.config.polling_interval)
                continue
            break
        if not success:
            LOG.error("Cannot connect to the Redis server.")
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
        perf_tool = self.client_dict.values()[0].perf_tool

        while (retry < retry_count and len(clist)):
            time.sleep(polling_interval)
            sample_count = 0
            while True:
                try:
                    msg = self.message_queue.popleft()
                except IndexError:
                    # No new message, commands are in executing
                    # clear active exc to prevent LOG pollution
                    sys.exc_clear()
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
                    self.result[vm_name] = instance.perf_client_parser(**payload['data'])
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

                elif cmd == 'DONE_MC':  # Multicast Done with batch.
                    instance = self.client_dict[vm_name]
                    try:
                        self.result = json.loads(payload['data']['stdout'])
                    except Exception:
                        LOG.error(payload['data']['stderr'])
                    clist = []
                elif cmd == 'DEBUG':
                    LOG.info('[%s] %s' + (vm_name, payload['data']))
                else:
                    LOG.error('[%s] received invalid command: %s' + (vm_name, cmd))

            log_msg = "VMs: %d Ready, %d Failed, %d Pending... Retry #%d" %\
                      (cnt_succ, cnt_failed, len(clist), retry)
            if sample_count != 0:
                log_msg += " (%d sample(s) received)" % sample_count
            LOG.info(log_msg)
            if sample_count != 0:
                report = perf_tool.consolidate_samples(samples, len(self.client_dict))
                self.report['seq'] = self.report['seq'] + 1
                self.report['report'] = report
                LOG.info('Periodical report: %s.' % str(self.report))
                samples = []
            retry = retry + 1

        return (cnt_succ, cnt_failed, len(clist))

    def wait_for_vm_up(self, timeout=300):
        LOG.info("Waiting for agents on VMs to come up...")
        cnt_succ = self.polling_vms(timeout)[0]
        if cnt_succ != len(self.client_dict):
            raise KBVMUpException("Some VMs failed to start.")
        self.send_cmd('ACK', None, None)

    def gen_host_stats(self):
        self.host_stats = {}
        for vm in self.result.keys():
            phy_host = self.client_dict[vm].host
            if phy_host not in self.host_stats:
                self.host_stats[phy_host] = []
            self.host_stats[phy_host].append(self.result[vm])

        perf_tool = self.client_dict.values()[0].perf_tool
        for phy_host in self.host_stats:
            self.host_stats[phy_host] = perf_tool.consolidate_results(self.host_stats[phy_host])

    @abc.abstractmethod
    def run(self, test_only=False):
        # must be implemented by sub classes
        return None

    def stop(self):
        self.send_cmd('ABORT', None, None)
