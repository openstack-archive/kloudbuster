==================================
KloudBuster Standard Scale Profile
==================================


Standard scale profile definition
----------------------------------

Multiple factors can impact data plane scale numbers measured by KloudBuster: VM
count, number of connections per VM, number of requests per seconds per VM,
timeout, etc...  To help obtaining quick and easy results without having to
tweak too many parameters, KloudBuster defines an off the shelf *default scale
profile*.

In the default scale profile for running HTTP load:

- The number of connections per VM is set to 1000;
- The number of requests per seconds per VM is set to 1000;
- The HTTP request timeout is set to 5 seconds;
- The stop limit for progression runs will be error packets greater than 50;
- The size of the HTML page in the server VMs will be 32768 Bytes;

As a reference, KloudBuster can run approximately 21 VMs (with 21,000
connections and 21,000 HTTP requests/sec) and achieve approximately 5 Gbps of
HTTP throughput on a typical multi-node Kilo OpenStack deployment (LinuxBridge +
VLAN, 10GE NIC card).

In the default scale profile for running Storage load:

- A standard set of 6 test cases (random read/write/mixed, sequential
  read/write/mixed);
- The IOPS limit per VM is set to 100 for random read/write/mixed test cases,
  and Rate limit per VM is set to 60MB/s for sequential read/write/mixed test
  cases;
- Block size is set to 4K for random read/write/mixed test cases, and 64K for
  sequential read/write/mixed test cases;
- IO Depth is set to 4 for random read/write/mixed test cases, and 64 for
  sequential read/write/mixed test cases;
- The stop limit for progression runs is degrading more than 20% of the target;

Note that it is hard to give a reference on storage testing since the
performance varies a lot on different hardware or solutions.


How to run the standard scale profile
-------------------------------------

In order to perform a run using the default scale profile, set the max VM counts
for the test, enable progression run and leave everything else with their
default values.  KloudBuster will start the iteration until reaching the stop
limit or the max scale. Eventually, once the KloudBuster run is finished, the
cloud performance can be told by looking at how many VMs KloudBuster can run to
and by looking at the latency charts.

Steps:

1. Enable progression runs:

    Running from CLI: Edit the config file, and set
    **client:progression:enabled** to True

    Running from Web UI: Navigate to "Interactive Mode" from the top menu
    bar, unfold the left panel for detail settings, under "Progression Test"
    section, and check the "Progression Test" checkbox.

2. Set up the max scale:

    The max scale basically means the max VM counts that KloudBuster will try to
    reach. In the case of HTTP testing, for a typical 10GE NIC card with VLAN
    encapsulation, 25 will be a good value; in the case of Storage testing,
    depends on the solution the deployment is using, pick a number from 10 to 25
    would usually be fine. Remember you can always adjust it to a more
    reasonable value based on your deployment details.

    Running from CLI: Edit the config file, and set **server:vms_per_network**
    to a proper value.

    Running from Web UI: Navigate to "Interactive Mode" from the top menu
    bar, unfold the left panel for detail settings, under "Staging Settings"
    section, and set "VMs/Network" to a proper value.


Interpret the results
---------------------

From the CLI, check the log and find the warning that KloudBuster gave, similar
to this::

    WARNING KloudBuster is stopping the iteration because the result reaches the stop limit.

One line before is the json output of last successful run, which has the number
in the "total_server_vms" field.

From the Web UI, in the "Interactive Mode" tab, you will see how many sets of
data are you getting. The second last set of data shows the last successful run,
which has the number in the "Server VMs" column.


