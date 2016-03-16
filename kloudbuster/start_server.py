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

from pkg_resources import resource_filename
import subprocess
import sys

def exec_command(cmd, cwd=None, show_console=False):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if show_console:
        for line in iter(p.stdout.readline, b""):
            print line,

    (_, stderr) = p.communicate()
    if p.returncode:
        print stderr
    return p.returncode

def main():
    cwd = resource_filename(__name__, 'config.py')
    cwd = cwd[:cwd.rfind('/')] + '/../kb_server'
    cmd = ['stdbuf', '-oL', 'python', 'setup.py', 'develop']
    rc = exec_command(cmd, cwd=cwd)
    if not rc:
        cmd = ['stdbuf', '-oL', 'pecan', 'serve', 'config.py']
        rc = exec_command(cmd, cwd=cwd, show_console=True)
        sys.exit(rc)

if __name__ == '__main__':
    main()
