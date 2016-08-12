#!/usr/bin/env python
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

import os
from pkg_resources import resource_filename
import subprocess
import sys

def exec_command(cmd, cwd=None, show_console=False):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if show_console:
        for line in iter(p.stdout.readline, b""):
            print line,

    p.communicate()
    return p.returncode

# will raise OSError exception if the command is not found
def launch_kb(cwd):
    for stdbuf in ['stdbuf', 'gstdbuf']:
        cmd = [stdbuf, '-oL', 'python', 'setup.py', 'develop']
        try:
            rc = exec_command(cmd, cwd=cwd)
            if not rc:
                cmd = [stdbuf, '-oL', 'pecan', 'serve', 'config.py']
                rc = exec_command(cmd, cwd=cwd, show_console=True)
            return rc
        except OSError:
            continue
    if os.uname()[0] == "Darwin":
        print
        print "To run the KloudBuster web server you need to install the coreutils package:"
        print "    brew install coreutils"
        print
    raise OSError('Cannot find stdbuf or gstdbuf command')

def main():
    cwd = resource_filename(__name__, 'config.py')
    cwd = cwd[:cwd.rfind('/')] + '/../kb_server'
    try:
        return launch_kb(cwd)
    except KeyboardInterrupt:
        print 'Terminating server...'
        return 1

if __name__ == '__main__':
    sys.exit(main())
