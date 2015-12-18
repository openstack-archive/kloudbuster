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

class KBRunner_Storage(KBRunner):
    """
    Control the testing VMs on the testing cloud
    """

    def __init__(self, client_list, config, expected_agent_version):
        KBRunner.__init__(self, client_list, config, expected_agent_version, single_cloue=True)

    def run(self, http_test_only=False):
        raise KBException("NOT IMPLEMENT")
