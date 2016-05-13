=====================
Configuration Options
=====================

.. _default_http_scale:

Default HTTP Scale Test
-----------------------

The default HTTP scale test will run on a single cloud and perform the following steps:

    * Create 2 tenants, 2 users, and 2 routers;
    * Create 1 shared network for both servers and clients tenants
    * Create 1 VM running the Redis server (for orchestration)
    * Create 1 VM running as an HTTP server
    * Create 1 VM running the HTTP traffic generator (defaults to 1000 connections,
      1000 requests per second, and 30 seconds duration)
    * Measure/aggregate throughput and latency
    * Bring down and cleanup

.. _default_storage_scale:

Default Storage Scale Test
--------------------------

The default storage scale test will use the following settings:

    * Create 1 tenant
    * Create 1 router
    * Create 1 private network
    * Create 1 VM and attach a 10 GB Cinder volume to it
    * Perform the default storage workload sequence:
       * random access 4KB block size, IO depth 4, 100 IOPs for 30 seconds
          * 100% read
          * 100% write
          * 70% read, 30% write
       * sequential access 64KB block size, IO depth 64, 60 MB/sec for 30 seconds
          * 100% read
          * 100% write
          * 70% read, 30% write
    * Measure/aggregate IOPs, throughput and latency
    * Bring down and cleanup

The run should take a few minutes (depending on how fast the cloud can
create the resources) and you should see the actions taken by KloudBuster
displayed on the console. Once this minimal scale test passes, you can tackle
more elaborate scale testing by increasing the scale numbers or providing
various traffic shaping options. See below sections for more details about
configuring KloudBuster.

KloudBuster Configuration File
------------------------------

To create a custom scale test configuration, make a copy of the default
configuration (this can be obtained by redirecting the output of
*--show-config* to a new file, as described in the quick start guide)
and modify that file to satisfy our own needs.
The configuration file follows the yaml syntax and contains options
that are documented using yaml comments.

.. note::

    The default configuration is always loaded by KloudBuster and
    any default option can be overridden by providing a custom configuration
    file that only contains modified options. So you can delete all the lines
    in the configuration file that you do not intend to change

Once modified, you can pass the configuration file to KloudBuster using the
*--config* option.


General Configuration Options
"""""""""""""""""""""""""""""

Each item in the configuration file is well documented. Below is
just a quick-start on some important config items that need to be paid more
attention to.

* **vm_creation_concurrency**

This controls the level of concurrency when creating VMs. There is no
recommended values, as it really varies and up to the cloud performance.
On a well-deployed cloud, you may able to push the values to more than 50.
The default value of 5 concurrent VM creations should be OK for most deployments.

.. note::

    For deployment prior to Kilo release, you may hit this
    `bug <https://bugs.launchpad.net/neutron/+bug/1194579>`_ if the
    concurrency level is too high. Try to lower down the value if
    you are hitting this issue.

* **server:number_tenants, server:routers_per_tenant,
  server:networks_per_router, server:vms_per_network**

These are the four key values which controls the scale of the cloud you are
going to create. Depends on how you want the VM to be created, sets these values
differently. For example, if we want to create 180 Server VMs, we could do
either of the following settings:

(1) 30 tenants, 1 router per tenant, 2 networks per router, and 3 VMs per
network (so-called 30*1*2*3);

(2) 20 tenants, 3 routers per tenant, 3 networks per router, and 1 VMs per
network (so-called 20*3*3*1);

* **server:secgroups_per_network**

Reference Neutron router implementation is using IPTABLES to perform
security controls, which should be OK for small scale networks. This
setting for now is to investigate the upper limit capacity that Neutron
can handle. Keep the default to 1 if you don't have the concerns on
this part yet.

* **client:progression**

KloudBuster will give multiple runs (progression) on the cloud under this mode.

If enabled, KloudBuster will start with certain amount of VMs, and put more VMs
into the testing for every iteration. The increment of the VM count is specified
by *vm_multiple*. The iteration will continue until it reaches the scale defined
in the upper sections, or the stop limit.

The stop limit is used for KloudBuster to determine when to stop the
progression, and do the cleanup if needed earlier.

In the case of HTTP testing:

    It is defines as: [number_of_err_packets,
    percentile_of_packet_not_timeout(%)]. For example: [50, 99.99] means,
    KloudBuster will continue the progression run only if **ALL** below
    conditions are satisfied:

    (1) The error count of packets are less or equal than 50;

    (2) 99.99% of the packets are within the timeout range;

In the case of Storage testing:

    It is a single integer indicating the degrading percentile. In the mode of
    random read and random write, this value indicates the percentile of
    degrading on IOPS, while in the mode of sequential read and sequential
    write, this value indicates the percentile of degrading on throughput.

    Assume the IOPS or throughput per VM is a fixed value, usually we are
    expecting higher values when the VM count grows. At certain point where the
    capacity of storage is reached, the overall performance will start to
    degrade.

    e.g. In the random read and random write mode, for example the IOPS is limited to
    100 IOPS/VM. In the iteration of 10 VMs, the requested IOPS for the system
    is 100 * 10 = 1000. However, the measured IOPS is degraded to only 800 IOPS.
    So the degraded percentile is calculated as 800/1000=20% for this set of
    data.


HTTP Test Specific Options
""""""""""""""""""""""""""

* **client:http_tool_configs**

This section controls how the HTTP traffic will be generated. Below are the two
values which determine the traffic::

    # Connections to be kept concurrently per VM
    connections: 1000
    # Rate limit in RPS per client (0 for unlimited)
    rate_limit: 1000

Each testing VM will have its targeting HTTP server for sending the requests.
Simply to say, connections determines the how many concurrent users that the
tool is emulating, and rate_limit determines how fast the HTTP request will be
sent. If the connections are more than the capacity of the cloud can handle,
socket errors or timeouts will occur; if the requests are sending too fast, you
will likely to have lots of requests responded very slow (will be reflected in
the latency distribution spectrum generated by KloudBuster).

Different cloud has different capacity to handle data plane traffics.  The best
practice is to have an estimate first, and get started.  In a typical 10GE VLAN
deployment, the line rate is about 9Gbps, or 1.125 GB/s. For pure HTTP traffic,
the effective rate minus the overhead is approximately 80% of the line rate,
which is about 920 MB/s. Each HTTP request will consume 32KB traffic for loading
the HTML page (HTML payload size is configurable), so the cloud capacity is
about 30,000 req/sec.  If you are staging a cloud with 20 testing pairs, the
rate_limit for each VM settings will be about (30000 / 20 = 1500).

The capacity for handling connections varies among factors including kernel
tuning, server software, server configs, etc. and hard to have an estimate. It
is simple to start with the same count as the rate_limit to have (1
request/connection) for each VM, and we can adjust it later to find out the
maximum value. If you see socket errors or timeouts, means the scale you are
testing is more than the cloud capacity.

Some other values which are self-explained, and you can change them as needed.


Storage Test Specific Options
"""""""""""""""""""""""""""""

* **client:storage_stage_configs**

This section defines the storage specific configs in the staging phase::

    # The number of VMs for running storage tests
    vm_count: 1
    # KloudBuster supports to run storage tests on Cinder Volumes or Ephemeral
    # Disks. Available options to be configured: ['volume', 'ephemeral'].
    target: 'volume'
    # Volumes size in GB for each VM
    disk_size: 10
    # The size of the test file for running IO tests in GB. Must be less or
    # equal than disk_size.
    io_file_size: 1

* **client:storage_tool_configs**

This section controls how the Storage tests will be performed. All the fields
are self-explained, and you can create your own test case with customized
parameters.


