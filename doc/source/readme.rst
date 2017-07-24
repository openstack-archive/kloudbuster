=====================
KloudBuster version 7
=====================

How good is your OpenStack **data plane** or **storage service** under real
heavy load?

KloudBuster is a tool that can load the data plane or storage infrastructure of
any OpenStack cloud at massive scale and measure how well the cloud behaves
under load where it matters: from the VMs standpoint, where cloud applications
run.

Accessible to anybody with basic knowledge of OpenStack, installs in minutes
and runs off the box with sensible default workloads in a fully automated way.
CLI/REST or Web User Interface.. you pick what works best for you.


Feature List
------------

* Neutron configuration agnostic (any encapsulation, any overlay, any plugin)

* OpenStack Storage backend agnostic

* Real VM-level performance and scale numbers (not bare metal)

* Punishing scale (thousands of VMs and enough load to fill even the fastest NIC
  cards or load any storage cluster with ease)

* Data plane with HTTP traffic load:

   * Can load the data plane with one OpenStack cloud (single-cloud operations
     for L3 East-West scale) or 2 OpenStack clouds (dual-cloud operations with
     one cloud hosting the HTTP servers and the other loading HTTP traffic for
     L3 North-South scale testing)

   * Real HTTP servers (Nginx) running in real Linux images (Ubuntu 14.04)

   * Can specify any number of tenants, routers and networks

   * Can specify any number of HTTP servers per tenant (as many as your cloud
     can handle)

   * High performance and highly scalable HTTP traffic generators to simulate
     huge number of HTTP users and TCP connections (hundreds of thousands to
     millions of concurrent and active connections)

   * Overall throughput aggegation and loss-less millisecond-precision latency
     aggregation for every single HTTP request (typically millions per run)

   * Traffic shaping to specify on which links traffic should flow

   * Can support periodic reporting and aggregation of results

* Storage load:

   * VM-level Cinder volume (block storage) or Ephemeral disk file I/O
     performance measurement using FIO running inside VMs (not bare metal)

   * Supports random and sequential file access mode

   * Supports any mix of read/write

   * Supports fixed load (e.g. 1000 IOPs/VM) or highest load measurement
     (KloudBuster will increase the load until latency spikes)

   * IOPs, bandwitdh and loss-less millisecond-precision latency aggregation
     for every IO operation (typically millions per run)

   * User configurable workload sequence

* Supports automated scale progressions (VM count series in any multiple
  increment) to reduce dramatically scale testing time

* Highly efficient and scalable metric aggregation

* Automatic cleanup upon termination

* Regular expression based cleanup script (:ref:`cleanup`)

* KloudBuster server mode to drive scale test:

    * from any browser (KloudBuster Web UI)

    * or from any external programs (KloudBuster REST API)

* Aggregated results provide an easy to understand way to assess the scale of
  the cloud under test

* KloudBuster VM image pre-built and available from the OpenStack Community App
  Catalog (https://apps.openstack.org/)

**Diagrams** describing how the scale test resources are staged and how the
traffic flows are available in :ref:`arch`.

Scale results are available in json form or in html form with javascript
graphical charts generated straight off the tool.

**Examples of results** are available in :ref:`gallery`.

New in Release 7
----------------

* The KloudBuster Docker container now includes the KloudBuster VM image for easier
  setup (no more need to install/uplaod the VM image separately)

* Supports more recent OpenStack releases with newer API versions (Newton, Ocata)


Limitations and Non-Goals
-------------------------

* Requires Neutron networking (does not support Nova networking)

* Only supports HTTP and storage traffic in this version

Unlike some other scaling test frameworks, KloudBuster does **not** attempt to:

    * Provide a scale test framework that works across different cloud
      technologies (OpenStack + AWS + Google Cloud + ...) - we are only
      focusing on OpenStack

    * Provide a scale test framework that is flexible and programmable to do
      everything - we just focus on opinionated and well targeted performance
      and scale areas with sensible use cases and available in a fully
      integrated and easy to consume packaged format

    * Replace bare metal and domain specific native performance and scale
      frameworks (line level traffic generators, ceph specific performance and
      scale tools...)


Contributions and Feedbacks
---------------------------

If you are interested in OpenStack Performance and Scale, contributions and
feedbacks are welcome!

If you have any feedbacks or would like to contribute,
send an email to openstack-dev@lists.openstack.org with a '[kloudbuster]'
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

* Complete documentation: `<http://kloudbuster.readthedocs.org>`_
* `KloudBuster REST API documentation Preview <https://htmlpreview.github.io/?https://github.com/openstack/kloudbuster/blob/master/doc/source/_static/kloudbuster-swagger.html>`_
* Source: `<https://github.com/openstack/kloudbuster>`_
* Supports/Bugs: `<http://launchpad.net/kloudbuster>`_
* Mailing List: kloudbuster-core@lists.launchpad.net

