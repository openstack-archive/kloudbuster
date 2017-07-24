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
#

from hdrh.histogram import HdrHistogram
import json
import multiprocessing
import redis
import socket
import struct
import subprocess
from subprocess import Popen
import sys
import threading
import time
import traceback

# Define the version of the KloudBuster agent and VM image
#
# When VM is up running, the agent will send the READY message to the
# KloudBuster main program, along with its version.
#
# This version is no longer checked starting from release 7
# and can be left constant moving forward.
__version__ = '7'

# TODO(Logging on Agent)

def exec_command(cmd, cwd=None):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    (stdout, stderr) = p.communicate()

    return p.returncode

def refresh_clock(clocks, force_sync=False):
    step = " "
    if force_sync:
        step = " -b "
    command = "sudo ntpdate" + step + clocks
    exec_command(command.split(" "))

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

    @staticmethod
    def add_multicast_route():
        cmd = "sudo route add -net 224.0.0.0/8 dev eth0"
        return exec_command(cmd.split(" "))

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

    # Run the multicast benchmarking tool
    # -p$1:$2 => $1 is the local port, $2 is the multicast port
    # SOURCE PORT should be the same for any one address that you want to
    @staticmethod
    def run_nuttcp(dest_path, target_url, target_port, multicast_addr, multicast_port, bitrate=100,
                   pktsize=1316, report_interval=4, transmit_receive='t'):

        if bitrate < 1:
            bitrate = str(bitrate * 1000) + "k"
        else:
            bitrate = str(bitrate) + "m"

        cmd = '%s -%s -fxmitstats -j -o -fparse -m30 -Ri%s/%s -l%i -T%i -i1 -g%s -p%d -P%d %s' % \
            (dest_path, transmit_receive, bitrate, bitrate, pktsize, report_interval,
             multicast_addr, multicast_port, target_port, target_url)
        return cmd

    # Init volume
    @staticmethod
    def init_volume(dest_path, size, mkfs):
        cmd = 'if [ ! -e /kb_mnt ]; then\n'
        cmd += 'mkfs.xfs /dev/vdb && ' if mkfs else ''
        cmd += 'mkdir -p /kb_mnt && '
        cmd += 'mount /dev/vdb /kb_mnt && '
        cmd += '%s --name=create_file --filename=/kb_mnt/kb_storage_test.bin '\
               '--size=%s --create_only=1\n' % (dest_path, size)
        cmd += 'fi'
        return cmd

    # Run fio
    @staticmethod
    def run_fio(dest_path, name, description, mode, block_size, iodepth, runtime,
                rate_iops=None, rate=None, rwmixread=None, status_interval=None, extra_opts=None):
        fixed_opt = '--thread --ioengine=libaio --output-format=json+ --direct=1 '
        fixed_opt += '--filename=/kb_mnt/kb_storage_test.bin '
        required_opt = '--name=%s --rw=%s --bs=%s --iodepth=%s --runtime=%s ' %\
            (name, mode, block_size, iodepth, runtime)
        optional_opt = ''
        optional_opt += '--rate_iops=%s ' % rate_iops if rate_iops else ''
        optional_opt += '--rate=%s ' % rate if rate else ''
        optional_opt += '--rwmixread=%s ' % rwmixread if rwmixread else ''
        optional_opt += '--status-interval=%s ' % status_interval if status_interval else ''
        optional_opt += extra_opts if extra_opts else ''
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

    def post_processing(self, p_out):
        return p_out

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
                if self.__class__.__name__ == "KBA_Multicast_Client":
                    self.report('DONE_MC', message['client-type'], cmd_res_dict)
                else:
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


class KBA_Multicast_Client(KBA_Client):
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

    def exec_check_nuttcp_service(self):
        return 0

    def post_processing(self, p_out):
        # Converts form: 'msmaxjitter=59.6045 ms...' into: {'jitter' : 59.6045, 'la'...}
        kmap = {'pkt': 'packets_recv', 'data_loss': 'data_loss', 'drop': 'packets_dropped',
                'megabytes': 'megabytes', 'rate_Mbps': 'mbps', 'msmaxjitter': 'jitter',
                'msavgOWD': 'latency'}  # Format/Include Keys
        try:
            return {kmap[k]: abs(float(v))
                    for (k, v) in [c.split("=")
                    for c in p_out.split(" ")]
                    if k in kmap}
        except Exception:
            return {'error': '0'}



    def exec_multicast_commands_report_helper(self, cmds, timeout=20, trans_recv=0):
        """Start len(cmds) threads to test"""
        queue = multiprocessing.Queue()
        cmd_index = 0
        j = 0
        output = {}

        #  Function for Process  #
        def spawn(cmd, queue):
            p = Popen(cmds[cmd][1].split(" "), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out = p.communicate()[0]
            out = out.replace("\n\n", "\n").split("\n")
            out = out[len(out) / 2]
            queue.put([cmds[cmd][0], out])
        #  End Function  #

        for cmd in cmds:
            multiprocessing.Process(target=spawn, args=(cmd_index, queue)).start()
            cmd_index += 1
        p_err = ""
        try:
            while(j < len(cmds)):
                out = queue.get(True, timeout)
                key = out[0]
                j += 1
                p_out = self.post_processing(out[1].rstrip())
                if key in output:
                    for k in output[key]:
                        output[key][k] += abs(p_out[k])
                else:
                    output[key] = p_out

        except Exception:
            exc_type, exc_value, exc_traceback = sys.exc_info()
            p_err = repr(traceback.format_exception(exc_type, exc_value,
                                                    exc_traceback))

        return (output, str(p_err))

    def exec_mulitcast_commands_report(self, cmds, timeout=20, trans_recv=0):
        """For each batch, pass it off to the helper to start threads.
        exec_multicast_commands_report_helper is blocking.
        """
        j_output = {}
        n_err = 0
        r_err = ""
        for cmd_list in cmds:
            try:
                refresh_clock(self.user_data['ntp_clocks'])
                round_output, err = self.exec_multicast_commands_report_helper(cmd_list,
                                                                               timeout, trans_recv)
                output_key = round_output.keys()[0]
                for key in round_output[output_key]:
                    round_output[output_key][key] /= float(len(cmd_list))
                j_output.update(round_output)
            except Exception:
                exc_type, exc_value, exc_traceback = sys.exc_info()
                err = repr(traceback.format_exception(exc_type, exc_value, exc_traceback))
            finally:
                if err != "":
                    n_err += 1
                    r_err = err
        return (0, json.dumps(j_output), r_err)

    def exec_run_multicast_test(self, nutt_tool_configs):
        """Tests varying nAddresses/ports/bandwidths for a constant packet size.
           Creates Batches of tests to run. One batch of commands is of size nAddresses * nPorts.
           Sends off len(bitrates) list of Batches to exec_mulitcast_commands_report
        """

        commands_list = []
        startAddr = nutt_tool_configs['multicast_address_start'].split(".")
        offset = int(startAddr[-1])
        startAddr = startAddr[:-1]
        startPort = 12000
        max_nAddr = nutt_tool_configs['address_pattern'][-1]
        max_nPort = nutt_tool_configs['port_pattern'][-1]
        duration = nutt_tool_configs['duration']
        server_address = nutt_tool_configs['server_address']
        target_url = self.user_data['target_url'] if server_address == '0.0.0.0' else server_address
        transmit_receive = 't' if server_address == '0.0.0.0' else 'r'
        target_port = 5000 if server_address == '0.0.0.0' else nutt_tool_configs['server_port']

        if transmit_receive == 'r':  # Manually join multicast group...
            for addr_i in range(0, max_nAddr):
                for port_i in range(0, max_nPort):
                    m_port = startPort + ((addr_i) * max_nPort) + (port_i)
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    m_addr = ".".join(startAddr + [str(offset + addr_i)])
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
                    mreq = struct.pack("4sl", socket.inet_aton(m_addr), socket.INADDR_ANY)
                    s.bind((m_addr, m_port))
                    s.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
            # Run this garbage test to ensure the listener is in the multicast group.
            comm = KB_Instance.run_nuttcp(dest_path='/usr/local/bin/nuttcp',
                                          target_url=target_url,
                                          target_port=target_port,
                                          multicast_port=12000,
                                          multicast_addr='231.0.0.1',
                                          bitrate=100,
                                          pktsize=1316,
                                          report_interval=60,
                                          transmit_receive='r')

            exec_command(comm.split(" "))

        nReceivers = nutt_tool_configs['receivers']
        pkt_s = nutt_tool_configs['pktsize']
        for index in range(0, len(nutt_tool_configs['address_pattern'])):
            nAddresses = nutt_tool_configs['address_pattern'][index]
            nPorts = nutt_tool_configs['port_pattern'][index]
            for bitrate in nutt_tool_configs['bitrates']:
                commands = []
                for addr_i in range(0, nAddresses):
                    for port_i in range(0, nPorts):
                        m_addr = ".".join(startAddr + [str(addr_i + offset)])
                        m_port = startPort + (addr_i * max_nPort) + (port_i)

                        comm = KB_Instance.run_nuttcp(dest_path='/usr/local/bin/nuttcp',
                                                      target_url=target_url,
                                                      target_port=target_port,
                                                      multicast_port=m_port,
                                                      multicast_addr=m_addr,
                                                      bitrate=bitrate,
                                                      pktsize=pkt_s,
                                                      report_interval=duration,
                                                      transmit_receive=transmit_receive)
                        key = "%d,%d,%d,%f,%d" % (nReceivers, nAddresses, nPorts, bitrate, pkt_s)
                        commands.append([key, comm])
                commands_list.append(commands)

        self.last_cmd = commands_list[-1][-1]
        t_r = 0 if transmit_receive == 't' else duration
        return self.exec_mulitcast_commands_report(commands_list,
                                                   trans_recv=t_r)

class KBA_Storage_Client(KBA_Client):

    def encode_bins(self, p_output):
        p_output = json.loads(p_output)
        p_output['jobs'][0].pop('trim')
        test_list = ['read', 'write']

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

    def exec_init_volume(self, vol_init_configs):
        self.last_cmd = KB_Instance.init_volume(
            dest_path='/usr/local/bin/fio',
            **vol_init_configs)
        return self.exec_command(self.last_cmd)

    def exec_run_storage_test(self, fio_configs):
        self.last_cmd = KB_Instance.run_fio(
            dest_path='/usr/local/bin/fio',
            name='kb_storage_test',
            **fio_configs)
        return self.exec_command_report(self.last_cmd)

    def post_processing(self, p_out):
        return self.encode_bins(p_out)


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

    def start_nuttcp_server(self):
        cmd = ['/usr/local/bin/nuttcp', '-S' '-P5000']
        return exec_command(cmd)

    def start_multicast_listener(self, mc_addrs, multicast_ports, start_address="231.0.0.128"):
        '''Starts Listeners at second /25 (.128).
           These listeners are created when nReceivers > 1.
        '''
        startPort = 12000
        startAddr = start_address.split(".")[:-1]
        start_offset = int(start_address.split(".")[-1])

        #  Thread Function  #
        def spawn_mcl(addr_i, port):
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            m_addr = ".".join(startAddr + [str(addr_i)])
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            ttl = struct.pack('B', 150)
            s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)

            mreq = struct.pack("4sl", socket.inet_aton(m_addr), socket.INADDR_ANY)
            s.bind((m_addr, port))
            s.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
            while True:
                d, e = s.recvfrom(10240)

        #  End Function  #

        for addr_i in range(0, mc_addrs):
            for port_i in range(0, multicast_ports):
                m_port = startPort + ((addr_i) * multicast_ports) + (port_i)
                multiprocessing.Process(target=spawn_mcl,
                                        args=(start_offset + addr_i, m_port,)).start()

        while True:
            continue

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
    if user_data.get('role').endswith('Server'):
        agent = KBA_Server(user_data)
        if user_data['role'].startswith('Multicast'):
            KB_Instance.add_multicast_route()
            if user_data['n_id'] == 0:
                refresh_clock(user_data.get('ntp_clocks'), force_sync=True)
                agent.start_nuttcp_server()
                while True:
                    refresh_clock(user_data.get('ntp_clocks'))
                    time.sleep(10)
                sys.exit(0)
            else:
                agent.start_multicast_listener(user_data.get('multicast_addresses'),
                                               user_data.get('multicast_ports'),
                                               user_data.get('multicast_listener_address_start'))
        if agent.config_nginx_server():
            sys.exit(agent.start_nginx_server())
        else:
            sys.exit(1)
    elif user_data.get('role').endswith('Client'):
        if user_data['role'].startswith('HTTP'):
            agent = KBA_HTTP_Client(user_data)
        elif user_data['role'].startswith('Multicast'):
            KB_Instance.add_multicast_route()
            refresh_clock(user_data.get('ntp_clocks'), force_sync=True)
            agent = KBA_Multicast_Client(user_data)
        else:
            agent = KBA_Storage_Client(user_data)
        agent.setup_channels()
        agent.hello_thread = threading.Thread(target=agent.send_hello)
        agent.hello_thread.daemon = True
        agent.hello_thread.start()
        agent.work()
    else:
        sys.exit(1)
