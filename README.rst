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

Read the full documentation with feature list, snapshots and diagrams, scale
test design, how-to and installation instructions:

`KloudBuster Documentation <http://kloudbuster.readthedocs.io>`_


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
* nuttcp: GPL v2 (http://nuttcp.net/nuttcp/beta/LICENSE)
Although the VM image includes a binary copy of the FIO code, it does not
include the source code used to build it.  In accordance to the GPL V2 license
related to the inclusion of binary copies of FIO, the source code used to build
the FIO binary copy was not modified and can be found directly at
`<https://github.com/axboe/fio>`_ or can be obtained by email request to the
maintainer of KloudBuster.

