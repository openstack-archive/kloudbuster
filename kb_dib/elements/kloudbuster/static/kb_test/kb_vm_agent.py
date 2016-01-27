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
import subprocess
import sys
import threading
import time

from hdrh.histogram import HdrHistogram
import redis

# Define the version of the KloudBuster agent and VM image
#
# When VM is up running, the agent will send the READY message to the
# KloudBuster main program, along with its version. The main program
# will check the version to see whether the image meets the minimum
# requirements to run, and stopped with an error if not.
#
# This version must be incremented if the interface changes or if new features
# are added to the agent VM
__version__ = '5'

# TODO(Logging on Agent)

def get_image_name():
    '''Return the versioned VM image name that corresponds to this
    agent code. This string must match the way DIB names the kloudbuster image.
    Return:
        the versioned image name without the extension ('.qcow2' is implicit)
    '''
    return 'kloudbuster_v' + __version__

def get_image_version():
    return __version__

def exec_command(cmd, cwd=None):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    (stdout, stderr) = p.communicate()

    return p.returncode

class KB_Instance(object):

    # Check whether the HTTP Service is up running
    @staticmethod
    def check_http_service(target_url):
        cmd = 'while true; do\n'
        cmd += 'curl --head %s --connect-timeout 2 --silent\n' % (target_url)
        cmd += 'if [ $? -eq 0 ]; then break; fi\n'
        cmd += 'done'
        return cmd

    # Add static route
    @staticmethod
    def add_static_route(network, next_hop_ip, if_name=None):
        debug_msg = "Adding static route %s with next hop %s" % (network, next_hop_ip)
        cmd = "sudo ip route add %s via %s" % (network, next_hop_ip)
        if if_name:
            debug_msg += " and %s" % if_name
            cmd += " dev %s" % if_name
        print debug_msg
        return cmd

    # Get static route
    @staticmethod
    def get_static_route(network, next_hop_ip=None, if_name=None):
        cmd = "ip route show %s" % network
        if next_hop_ip:
            cmd += " via %s" % next_hop_ip
        if if_name:
            cmd += " dev %s" % if_name
        return cmd

    # Delete static route
    @staticmethod
    def delete_static_route(network, next_hop_ip=None, if_name=None):
        debug_msg = "Deleting static route %s" % network
        cmd = "sudo ip route del %s" % network
        if next_hop_ip:
            debug_msg = " with next hop %s" % next_hop_ip
            cmd += " via %s" % next_hop_ip
        if if_name:
            if next_hop_ip:
                debug_msg = " and %s" % if_name
            else:
                debug_msg = "with next hop %s" % if_name
            cmd += " dev %s" % if_name
        print debug_msg
        return cmd

    # Run the HTTP benchmarking tool
    @staticmethod
    def run_wrk2(dest_path, target_url, threads, connections,
                 rate_limit, duration, timeout, connection_type,
                 report_interval):
        if not rate_limit:
            rate_limit = 65535

        cmd = '%s -t%d -c%d -R%d -d%ds -p%ds --timeout %ds -D2 -e %s' % \
              (dest_path, threads, connections, rate_limit, duration,
               report_interval, timeout, target_url)
        return cmd

    # Init volume
    @staticmethod
    def init_volume(size):
        cmd = 'if [ ! -e /mnt/volume ]; then\n'
        cmd += 'mkfs.xfs /dev/vdb && '
        cmd += 'mkdir -p /mnt/volume && '
        cmd += 'mount /dev/vdb /mnt/volume && '
        cmd += 'dd if=/dev/zero of=/mnt/volume/kb_storage_test.bin bs=%s count=1\n' % size
        cmd += 'fi'
        return cmd

    # Run fio
    @staticmethod
    def run_fio(dest_path, name, mode, block_size, iodepth,
                runtime, rate_iops=None, rate=None, status_interval=None):
        fixed_opt = '--thread --ioengine=libaio --output-format=json+ --direct=1 '
        fixed_opt += '--filename=/mnt/volume/kb_storage_test.bin '
        required_opt = '--name=%s --rw=%s --bs=%s --iodepth=%s --runtime=%s ' %\
            (name, mode, block_size, iodepth, runtime)
        optional_opt = ''
        optional_opt += '--rate_iops=%s ' % rate_iops if rate_iops else ''
        optional_opt += '--rate=%s ' % rate if rate else ''
        optional_opt += '--status-interval=%s ' % status_interval if status_interval else ''
        cmd = '%s %s %s %s' % (dest_path, fixed_opt, required_opt, optional_opt)
        return cmd


class KBA_Client(object):

    def __init__(self, user_data):
        host = user_data['redis_server']
        port = user_data['redis_server_port']
        self.user_data = user_data
        self.redis_obj = redis.StrictRedis(host=host, port=port)
        self.pubsub = self.redis_obj.pubsub(ignore_subscribe_messages=True)
        self.hello_thread = None
        self.stop_hello = threading.Event()
        self.vm_name = user_data['vm_name']
        self.orches_chan_name = "kloudbuster_orches"
        self.report_chan_name = "kloudbuster_report"
        self.last_cmd = None
        self.last_process = None

    def setup_channels(self):
        # Check for connections to redis server
        while (True):
            try:
                self.redis_obj.get("test")
            except (redis.exceptions.ConnectionError):
                time.sleep(1)
                continue
            break

        # Subscribe to orchestration channel
        self.pubsub.subscribe(self.orches_chan_name)

    def report(self, cmd, client_type, data):
        message = {'cmd': cmd, 'sender-id': self.vm_name,
                   'client-type': client_type, 'data': data}
        self.redis_obj.publish(self.report_chan_name, message)

    def send_hello(self):
        # Sending "hello" message to master node every 2 seconds
        while not self.stop_hello.is_set():
            self.report('READY', None, __version__)
            time.sleep(2)

    def post_processing(self, p_output):
        # If the result is coming from storage testing tool (FIO), compress
        # the buckets from the output using HdrHistogram, and send it back
        # to kb-master node.
        if self.__class__.__name__ == 'KBA_Storage_Client':
            return self.encode_bins(p_output)

    def exec_command(self, cmd):
        # Execute the command, and returns the outputs
        cmds = ['bash', '-c']
        cmds.append(cmd)
        p = subprocess.Popen(cmds, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.last_process = p
        (stdout, stderr) = p.communicate()

        return (p.returncode, stdout, stderr)

    def exec_command_report(self, cmd):
        # Execute the command, reporting periodically, and returns the outputs
        cmd_res_dict = None
        cmds = ['bash', '-c']
        cmds.append(cmd)
        p_output = ''
        p = subprocess.Popen(cmds, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.last_process = p

        lines_iterator = iter(p.stdout.readline, b"")
        for line in lines_iterator:
            # One exception, if this is the very last report, we will send it
            # through "DONE" command, not "REPORT". So what's happening here
            # is to determine whether this is the last report.
            if cmd_res_dict:
                self.report('REPORT', 'http', cmd_res_dict)
                cmd_res_dict = None
                p_output = line
            else:
                p_output += line
                if line.rstrip() == "}":
                    p_output = self.post_processing(p_output)
                    cmd_res_dict = dict(zip(("status", "stdout", "stderr"), (0, p_output, '')))

        stderr = p.communicate()[1]
        return (p.returncode, p_output, stderr)

    def work(self):
        for item in self.pubsub.listen():
            if item['type'] != 'message':
                continue
            # Convert the string representation of dict to real dict obj
            message = eval(item['data'])
            if message['cmd'] == 'ABORT':
                try:
                    self.last_process.kill()
                except Exception:
                    pass
            else:
                work_thread = threading.Thread(target=agent.process_cmd, args=[message])
                work_thread.daemon = True
                work_thread.start()

    def process_cmd(self, message):
        if message['cmd'] == 'ACK':
            # When 'ACK' is received, means the master node
            # acknowledged the current VM. So stopped sending more
            # "hello" packet to the master node.
            # Unfortunately, there is no thread.stop() in Python 2.x
            self.stop_hello.set()
        elif message['cmd'] == 'EXEC':
            self.last_cmd = ""
            arange = message['data']['active_range']
            my_id = int(self.vm_name[self.vm_name.rindex('I') + 1:])
            if (not arange) or (my_id >= arange[0] and my_id <= arange[1]):
                try:
                    par = message['data'].get('parameter', '')
                    str_par = 'par' if par else ''
                    cmd_res_tuple = eval('self.exec_%s(%s)' % (message['data']['cmd'], str_par))
                    cmd_res_dict = dict(zip(("status", "stdout", "stderr"), cmd_res_tuple))
                except Exception as exc:
                    cmd_res_dict = {
                        "status": 1,
                        "stdout": self.last_cmd,
                        "stderr": str(exc)
                    }
                self.report('DONE', message['client-type'], cmd_res_dict)
        else:
            # Unexpected
            print 'ERROR: Unexpected command received!'

class KBA_HTTP_Client(KBA_Client):

    def exec_setup_static_route(self):
        self.last_cmd = KB_Instance.get_static_route(self.user_data['target_subnet_ip'])
        result = self.exec_command(self.last_cmd)
        if (self.user_data['target_subnet_ip'] not in result[1]):
            self.last_cmd = KB_Instance.add_static_route(
                self.user_data['target_subnet_ip'],
                self.user_data['target_shared_interface_ip'])
            return self.exec_command(self.last_cmd)
        else:
            return (0, '', '')

    def exec_check_http_service(self):
        self.last_cmd = KB_Instance.check_http_service(self.user_data['target_url'])
        return self.exec_command(self.last_cmd)

    def exec_run_http_test(self, http_tool_configs):
        self.last_cmd = KB_Instance.run_wrk2(
            dest_path='/usr/local/bin/wrk2',
            target_url=self.user_data['target_url'],
            **http_tool_configs)
        return self.exec_command_report(self.last_cmd)

class KBA_Storage_Client(KBA_Client):

    def encode_bins(self, p_output):
        p_output = json.loads(p_output)
        test_list = ['read', 'write', 'trim']

        for test in test_list:
            histogram = HdrHistogram(1, 5 * 3600 * 1000, 3)
            clat = p_output['jobs'][0][test]['clat']['bins']
            total_buckets = clat['FIO_IO_U_PLAT_NR']
            grp_msb_bits = clat['FIO_IO_U_PLAT_BITS']
            buckets_per_grp = clat['FIO_IO_U_PLAT_VAL']

            for bucket in xrange(total_buckets):
                if clat[str(bucket)]:
                    grp = bucket / buckets_per_grp
                    subbucket = bucket % buckets_per_grp
                    if grp == 0:
                        val = subbucket - 1
                    else:
                        base = 2 ** (grp_msb_bits + grp - 1)
                        val = int(base + (base / buckets_per_grp) * (subbucket - 0.5))
                    histogram.record_value(val, clat[str(bucket)])

            p_output['jobs'][0][test]['clat']['hist'] = histogram.encode()
            p_output['jobs'][0][test]['clat'].pop('bins')
            p_output['jobs'][0][test]['clat'].pop('percentile')

        return json.dumps(p_output)

    def exec_init_volume(self, size):
        self.last_cmd = KB_Instance.init_volume(size)
        return self.exec_command(self.last_cmd)

    def exec_run_storage_test(self, fio_configs):
        self.last_cmd = KB_Instance.run_fio(
            dest_path='/usr/local/bin/fio',
            name='kb_storage_test',
            **fio_configs)
        return self.exec_command_report(self.last_cmd)


class KBA_Server(object):

    def __init__(self, user_data):
        self.user_data = user_data

    def config_nginx_server(self):
        # Generate the HTML file with specified size
        html_size = self.user_data['http_server_configs']['html_size']
        cmd_str = 'dd if=/dev/zero of=/data/www/index.html bs=%s count=1' % html_size
        cmd = cmd_str.split()
        return False if exec_command(cmd) else True

    def start_nginx_server(self):
        cmd = ['sudo', 'service', 'nginx', 'start']
        return exec_command(cmd)

    # def start_nuttcp_server(self):
    #     cmd = ['/usr/bin/nuttcp', '-P5002', '-S', '--single-threaded']
    #     return exec_command(cmd)

class KBA_Proxy(object):

    def start_redis_server(self):
        cmd = ['sudo', 'service', 'redis-server', 'start']
        return exec_command(cmd)


if __name__ == "__main__":
    try:
        with open('user-data', 'r') as f:
            user_data = dict(eval(f.read()))
    except Exception as e:
        # KloudBuster starts without user-data
        cwd = 'kloudbuster/kb_server'
        cmd = ['python', 'setup.py', 'develop']
        rc = exec_command(cmd, cwd=cwd)
        if not rc:
            cmd = ['/usr/local/bin/pecan', 'serve', 'config.py']
            sys.exit(exec_command(cmd, cwd=cwd))

    if user_data.get('role') == 'KB-PROXY':
        agent = KBA_Proxy()
        sys.exit(agent.start_redis_server())
    if user_data.get('role') == 'Server':
        agent = KBA_Server(user_data)
        if agent.config_nginx_server():
            sys.exit(agent.start_nginx_server())
        else:
            sys.exit(1)
    elif user_data.get('role')[-6:] == 'Client':
        agent = KBA_HTTP_Client(user_data) if user_data['role'][:-7] == 'HTTP'\
            else KBA_Storage_Client(user_data)
        agent.setup_channels()
        agent.hello_thread = threading.Thread(target=agent.send_hello)
        agent.hello_thread.daemon = True
        agent.hello_thread.start()
        agent.work()
    else:
        sys.exit(1)
