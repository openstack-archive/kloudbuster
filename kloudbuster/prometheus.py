#!/usr/bin/env python
# Copyright 2018 Cisco Systems, Inc.  All rights reserved.
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

import requests
import time


class Prometheus(object):
    def __init__(self, server_ip="localhost", server_port="9090"):
        self.server_address = "http://{}:{}/api/v1/".format(server_ip, server_port)

    def get_results(self, start_time, end_time=time.time(), step_size=30):
        try:
            return requests.get(
                url="{}query_range?query=cpu_usage_system{{"
                    "tag=%22ceph%22}}&start={}&end={}&step={}".format(self.server_address,
                                                                      start_time,
                                                                      end_time,
                                                                      step_size)).json()

        except requests.exceptions.RequestException as e:
            print e
            return None
