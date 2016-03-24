========
Overview
========

How good is your OpenStack data plane or storage plane under real heavy load?

KloudBuster is a tool that can load the data or storage plane of any OpenStack
cloud at massive scale and can measure how well the cloud behaves under load.

Anybody with basic knowledge of OpenStack, data plane and storage
performance concepts can use the tool and get scale numbers for any OpenStack
cloud straight off the box with pre-defined default workloads.

No need for complex installation as the KloudBuster installation takes care of
all the dependencies.


Features
--------

* Neutron configuration agnostic (any encapsulation, any overlay, any plugin)

* OpenStack Storage backend agnostic

* User can specify any number of tenants, routers, networks, VM instances (only
  limited by cloud capacity) and KloudBuster will stage all these resources in a
  way that makes sense for operational usage

* Real VM-level performance and scale numbers (not bare metal)

* Punishing scale (thousands of VMs and enough load to fill even the fastest NIC
  cards or load any storage cluster with ease - if your cloud can even support
  that much)

* Data plane with HTTP traffic load:

   * Can load the data plane with one OpenStack cloud (single-cloud operations
     for L3 East-West scale) or 2 OpenStack clouds (dual-cloud operations with
     one cloud hosting the HTTP servers and the other loading HTTP traffic for
     L3 North-South scale testing)

   * Real HTTP servers (Nginx) running in real Linux images (Ubuntu 14.04)

   * Can specify any number of HTTP servers per tenant (as many as your cloud
     can handle)

   * High performance and highly scalable HTTP traffic generators to simulate
     huge number of HTTP users and TCP connections (hundreds of thousands to
     millions of concurrent and active connections)

   * Overall throughput aggegation and loss-less latency aggregation for every
     single HTTP request (typically millions per run) using the open source
     HdrHistogram library

   * Traffic shaping to specify on which links traffic should flow

   * Can support periodic reporting and aggregation of results

* Storage load:

   * VM-level Cinder volume (block storage) or Ephemeral disk file I/O performance measurement
     using FIO running inside VMs (not bare metal)

   * Supports random and sequential file access mode

   * Supports read, write and read/write mix

   * IOPs, bandwitdh and loss-less latency aggregation

   * User configurable storage workload profiles

* Supports automated scale progressions (VM count series in any multiple
  increment) to reduce dramatically scale testing time

* Highly efficient and scalable metric aggregation

* Automatic cleanup upon termination (can be disabled)

* Manual cleanup script

* KloudBuster Server to drive scale test:

    * from any browser (KloudBuster Web UI)

    * from any external programs (KloudBuster REST API)

* Aggregated results provide an easy to understand way to assess the scale of
  the cloud under test

* KloudBuster VM image pre-built and available from the OpenStack Community App
  Catalog (https://apps.openstack.org/)


Limitations and Non-Goals
-------------------------

* Requires Neutron networking (does not support Nova networking)
* Only supports HTTP and storage traffic in this version

Unlike some other scaling test frameworks, KloudBuster does *not* attempt to:

* provide a scale test framework that works across different cloud technologies
  (OpenStack + AWS + Google Cloud + ...) - we are only focusing on OpenStack

* provide a scale test framework that is flexible and programmable to do everything - 
  we just focus on opinionated and well targeted performance and scale areas
  with sensible use cases and available in a fully integrated and easy to consume
  packaged format

* replace bare metal and domain specific native performance and scale frameworks 
  (line level traffic generators, ceph specific performance and scale tools...)



Contributions and Feedbacks
---------------------------

If you are interested in OpenStack Performance and Scale, contributions and
feedbacks are welcome!

If you have any feedbacks or would like to make small or large contributions,
simply send an email to openstack-dev@lists.openstack.org with a '[kloudbuster]'
tag in the subject.


Licensing
---------

KloudBuster is licensed under the Apache License, Version 2.0 (the "License").
You may not use this tool except in compliance with the License.  You may obtain
a copy of the License at `<http://www.apache.org/licenses/LICENSE-2.0>`_

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied.  See the License for the
specific language governing permissions and limitations under the License.

KloudBuster VM images contain multiple open source license components:

* nginx: BSD License (http://nginx.org/LICENSE)
* wrk2: Apache License 2.0
  (https://raw.githubusercontent.com/giltene/wrk2/master/LICENSE)
* Redis: BSD License (http://redis.io/topics/license)
* FIO: GPL v2 (https://raw.githubusercontent.com/axboe/fio/master/MORAL-LICENSE)

Although the VM image includes a binary copy of the FIO code, it does not
include the source code used to build it.  In accordance to the GPL V2 license
related to the inclusion of binary copies of FIO, the source code used to build
the FIO binary copy was not modified and can be found directly at
`<https://github.com/axboe/fio>`_ or can be obtained by email request to the
maintainer of KloudBuster.


Links
-----

* Documentation: `<http://kloudbuster.readthedocs.org>`_
* `KloudBuster REST API documentation Preview <https://htmlpreview.github.io/?https://github.com/openstack/kloudbuster/blob/master/doc/source/_static/kloudbuster-swagger.html>`_
* Source: `<http://git.openstack.org/cgit/openstack/kloudbuster>`_
* Supports/Bugs: `<http://launchpad.net/kloudbuster>`_
* Mailing List: kloudbuster-core@lists.launchpad.net

