=====
Usage
=====

There are total of three ways of running KloudBuster, and the easiest way
to start is using the **Web UI**. It offers the most friendly interface, and
also needs the least learning to get started. **CLI** is the traditional way
to run applications. It has the most comprehensive feature sets when compared
to the other two ways, and also it is pretty much the only choice if you don't
have a GUI enabled environment. **Rest API** gives another way to access
and control KloudBuster. All APIs provided are well documented, and the
built-in web UI is fully implemented on top of these APIs.

The default scale settings of KloudBuster is at minimal scale, which is
generally safe to run on any cloud, small or large. It should also work on
an all-in-one devstack cloud installation as well. The minimal pre-requisites
to run KloudBuster:

    * Admin access to the cloud under test
    * 3 available floating IPs


Running KloudBuster with Web UI
-------------------------------

The Web UI is developed using AngularJS framework, which needs to be built
before serving. If you want the web app to run on localhost, you have to
build it from source, and start the KloudBuster server. Refer to
:ref:`here <build_web_ui>` for the steps to build the web app, and refer to
:ref:`below section <start_kloudbuster_server>` for the steps to start the
KloudBuster server.

An easier and better way is to use the KloudBuster image. The KloudBuster
image has the Web UI built-in, and it is ready to use once up running. It
is as easy as create a new regular VM with OpenStack in OpenStack. Here
are the steps for get the KloudBuster Web UI running from scratch:

1. Follow the steps :ref:`here <upload_kb_image>` to upload the KloudBuster
   image to the cloud uder test;

2. Create and configure the Routers, Networks for holding a new VM;

3. Create a new security group, which allows the ingress TCP traffic on
   port 8080;

4. Launch an instance using the KloudBuster image，with the security group
   we just created, and connect to the network we just created. Leave the
   Key Pair as blank, as we don't need the SSH access to this VM;

5. Associate a floating IP to the newly created VM;

6. Open your browser, and type the below address to get started::

    http://<floating_ip>:8080/ui/index.html


Running KloudBuster with CLI
----------------------------

KloudBuster needs the access info and the credentials to the cloud uner test,
and these information can be downloaded from a Horizon dashboard
(Project|Acces&Security!Api Access|Download OpenStack RC File). Save it to
your local filesystem for future use.

KloudBuster is ready to run with the default configuration, which can be
displayed from the command line using *--show-config* option. By default,
KloudBuster will run on a single cloud mode and create:

    * 2 tenants, 2 users, and 2 routers;
    * 1 shared network for both servers and clients tenants
    * 1 VM running as an HTTP server
    * 1 VM running the Redis server (for orchestration)
    * 1 VM running the HTTP traffic generator (default to 1000 connections,
      1000 requests per second, and 30 seconds duration)

Run kloudbuster with the following options::

    kloudbuster --tested-rc <path_to_the_admin_rc_file> --tested-passwd <admin_password>

The run should take couple of minutes (depending on how fast of the cloud to
create resources) and you should see the actions taken by KloudBuster
displayed on the console. Once the test is done, all resources will be
cleaned up and results will be displayed.

Once this minimal scale test passes, you can tackle more elaborate scale
testing by increasing the scale numbers or providing various traffic shaping
options. See below sections for more details about configuring KloudBuster.


Configure KloudBuster
^^^^^^^^^^^^^^^^^^^^^

Usually, we can create our own configuration file based on the default
by redirecting the output of *--show-config* to a new file. Modify
the new file to satisfy our own needs, and pass it to the KlousBuster
command line using the *--config*.

.. note::

    Note that the default configuration is always loaded by KloudBuster and
    any default option can be overridden by providing a custom configuration
    file that only contains modified options.

Each item in cfg.scale.yaml is well documented and self-explained. Below is
just a quick-start on some important config items that need to be paid more
attention.

* **vm_creation_concurrency**

This controls the level of concurrency when creating VMs. There is no
recommended values, as it really varies and up to the cloud performance.
On a well-deployed cloud, you may able to push the values to more than 50.
Safely to say, 5 would be OK for most deployments.

.. note::

    For deployment prior to Kilo release, you may hit this
    `bug <https://bugs.launchpad.net/neutron/+bug/1194579>`_ if the
    concurrency level is too high. Try to lower down the value if
    you are hitting this issue.

* **server:number_tenants, server:routers_per_tenant,
  server:networks_per_router, server:vms_per_network**

These are the four key values which controls the scale of the cloud you
are going to create. Depends on how you want the VM to be created, sets
these values differently. For example, if we want to create 180 Server VMs,
we could do either of the following settings:

(1) 30 tenants, 1 router per tenant, 2 networks per router, and 3 VMs
per network (so-called 30*1*2*3);

(2) 20 tenants, 3 routers per tenant, 3 networks per router, and 1 VMs
per network (so-called 20*3*3*1);

* **server:secgroups_per_network**

Reference Neutron router implementation is using IPTABLES to perform
security controls, which should be OK for small scale networks. This
setting for now is to investigate the upper limit capacity that Neutron
can handle. Keep the default to 1 if you don't have the concerns on
this part yet.

* **client:progression**

KloudBuster will give multiple runs (progression) on the cloud under this
mode.

If enabled, KloudBuster will start the testing with certain amount of
VMs specified by vm_start. For each iteration, KloudBuster will putting
more VMs into the testing (specified by vm_step). The iteration will
continue until it reaches the scale defined in the upper sections, or
the stop limit.

The stop limit is used for KloudBuster to determine when to stop the
progression, and do the cleanup if needed earlier. It defines as:
[number_of_err_packets, percentile_of_packet_not_timeout(%)].

For example: [50, 99.99] means, KloudBuster will continue the progression
run only if **ALL** below conditions are satisfied:

(1) The error count of packets are less or equal than 50;

(2) 99.99% of the packets are within the timeout range;

* **client:http_tool_configs**

This section is IMPORTANT, as it controls how the HTTP traffic will be
generated. Below are the two values which determines the traffic::

    # Connections to be kept concurrently per VM
    connections: 1000
    # Rate limit in RPS per client (0 for unlimited)
    rate_limit: 1000

Each testing VM will have its targeting HTTP server for sending the
requests. Simply to say, connections determines the how many concurrent
users that the tool is emulating, and rate_limit determines how fast
the HTTP request will be sent. If the connections are more than the
capacity of the cloud can handle, socket errors or timeouts will occur;
if the requests are sending too fast, you will likely to have lots of
requests responded very slow (will be reflected in the latency
distribution spectrum generated by KloudBuster).

Different cloud has different capacity to handle data plane traffics.
The best practice is to have an estimate first, and get started.
In a typical 10GE VLAN deployment, the line rate is about 9Gbps, or
1.125 GB/s. For pure HTTP traffic, the effective rate minus the overhead
is approximately 80% of the line rate, which is about 920 MB/s. Each
HTTP request will consume 32KB traffic for loading the HTML page (HTML
payload size is configurable), so the cloud capacity is about 30,000 req/sec.
If you are staging a cloud with 20 testing pairs, the rate_limit for each
VM settings will be about (30000 / 20 = 1500).

The capacity for handling connections varies among factors including
kernel tuning, server software, server configs, etc. and hard to have
an estimate. It is simple to start with the same count as the rate_limit
to have (1 request/connection) for each VM, and we can adjust it later
to find out the maximum value. If you see socket errors or timeouts, means
the scale you are testing is more than the cloud capacity.

Some other values which are self-explained, and you can change them as needed.


Advanced Features
^^^^^^^^^^^^^^^^^

Control the VM Placement
""""""""""""""""""""""""

By default, VMs are placed by NOVA using its own scheduling logic. However,
traffic can be shaped precisely to fill the appropriate network links by using
specific configuration settings. KloudBuster can change that behavior, and
force NOVA to place VMs on desired hypervisors as we defined by supplying
the topology file.

The format of the topology file is relatively simple, and group into two
sections. See file "cfg.topo.yaml" for an example.

The "servers_rack" section contains the hypervisors that the server side VMs
will be spawned on, and the "clients_rack" section contains the hypervisors
that the client side VMs will be spawned on. The hypervisor names can be
obtained from Horizon dashboard, or via "*nova hypervisor-list*". Note that
the name in the config files must exactly match the name shown in Horizon
dashboard or NOVA API output.

A typical use case is to place all server VMs on one rack, and all client VMs
on the other rack to test Rack-to-Rack performance. Similarly, all server VMs
on one host, and all client VMs on the other host to test the Host-to-Host
performance.

To use this feature, just pass *-t <path_to_topo_file>* to the kloudbuster
command line.

.. note:: Admin access is required to use this feature.


Running KloudBuster without admin access
""""""""""""""""""""""""""""""""""""""""

When there is no admin access to the cloud under test, KloudBuster does
support to run and reused the existing tenant and user for running tests.
You have to ask the cloud admin one time to create the resources in advance,
and KloudBuster will create the resources using the pre-created tenant/user.

When running under the tenant/user reusing mode:

    * Only one tenant will be used for hosting both server cloud and client
      cloud resources;
    * Only two users will be used for creating resources, and each cloud has
      its own user;

And also there are some limitations that you should aware:

    * The VM placement feature will not be supported;
    * The flavor configs will be ignored, and the KloudBuster will
      automatically pick the closest flavor settings from the existing list;
    * KloudBuster will not automatically adjust the tenant quota, and give
      warnings when quota exceeded;

See file "cfg.tenants.yaml" for an example. Modify the settings to match your
cloud.

To use this feature, just pass *-l <path_to_tenants_file>* to the kloudbuster
command line.


Examples of running KloudBuster
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Assuming the OpenStack RC file is stored at ~/admin_openrc.sh, and the
password is "admin". Running the program is relatively easy, some examples
are given to help get started quickly.

.. note::

    Before going to large scale test, it is strongly recommended to start with
    a small scale. The default config is a good point to start with. It will
    make sure KloudBuster is talking to the clouds well.


Example 1: Single-cloud Mode
""""""""""""""""""""""""""""

Kloudbuster will create both server VMs and client VMs in the same cloud if
only one RC file is provided::

    $ kloudbuster --tested-rc ~/admin_openrc.sh --tested-passwd admin


Example 2: Dual-cloud Mode, Save results
""""""""""""""""""""""""""""""""""""""""

Assume the cloud for server VMs is ~/admin_openrc1.sh, and the cloud for
client VMs is ~/admin_openrc2.sh. The password for both clouds is "admin".
Also save the results to a JSON file once the run is finished::

    $ kloudbuster --tested-rc ~/admin_openrc1.sh --tested-passwd admin --testing-rc ~/admin_openrc2.sh --testing-passwd admin --json result.json


Example 3: Single-cloud Mode, Customized VM placements
""""""""""""""""""""""""""""""""""""""""""""""""""""""

.. code::

    $ kloudbuster --tested-rc ~/admin_openrc.sh --tested-passwd admin -t cfg.topo.yaml


Interpret the Results
^^^^^^^^^^^^^^^^^^^^^

KloudBuster does come with a good Web UI to display the results in a pretty
graphical way. However, in the case if you are not using the Web UI,
KloudBuster also has a small tool locally to generate the chart. It accepts
JSON files generated by KloudBuster. To see the chart in HTML, simply run::

    $ kb_gen_chart -c <HTML_FILANAME_TO_SAVE> <JSON_FILE>

Check::

    $ kb_gen_chart -h

for more options.


Running with Rest API
---------------------

.. note::

    As of now, the Web UI can only be started when KloudBuster is using
    GitHub/OpenStack Repository based installation.

All Rest APIs are well documented using `Swagger <http://swagger.io/>`_. In
order to view them in a nice format, copy the entire contents of file
kb_server/kloudbuster-swagger.yaml, and paste into the left panel of
http://editor.swagger.io. Then you will see the specification of all Rest
APIs in the right panel of the web page.

.. _start_kloudbuster_server:

KloudBuster integrates a Python based web server
`Pecan <http://www.pecanpy.org/>`_ to host both the KloudBuster Rest API
server and the KloudBuster front-end website, which listens to
localhost:8080 by default.

From the root of the KloudBuster repository, go to kb_server directory.
If this is the first time to start the server, run below command once
to setup the environment::

    $ python setup.py develop

Then start the server by doing::

    $ pecan serve config.py

Idealy, you should see a message like below, which indicates the server
is up running::

    Starting server in PID 26431
    serving on 0.0.0.0:8080, view at http://127.0.0.1:8080

Once the server is started, you can use different HTTP methods
(GET/PUT/POST/DELETE) to interactive with KloudBuster.


KloudBuster Standard Profiling
------------------------------

KloudBuster is able to perform the scale testing using different cominations
of configurations. There are multiple factors which can impact the final
results (VM count, number of connections per VM, number of requests per
seconds per VM, timeout, etc.). So KloudBuster is defining a specific set of
configurations among all cominations as a standard run.

In the standard run, the number of connections per VM will be set to 1000,
the number of requests per seconds per VM is set to 1000, the HTTP request
timeout is set to 5 seconds. The stop limit for progression runs will be error
packets greater than 50. The size of the HTML page in the server VMs will be
32768 Bytes. Above configurations are all set by default.

In order to perform the standard run, set the max VM counts for the tests,
and enable the rogression runs. KloudBuster will start the iteration until
reaching the stop limit or the max scale. Eventually, once the KloudBuster
run is finished, the cloud performance can be told by looking at how many VMs
KloudBuster can run to.

As a reference, for a Kilo OpenStack deployment (LinuxBridge + VLAN) with
Packstack, using an 10GE NIC card for data plane traffic, KloudBuster can run
apprximately 21 VMs and achieve approximately 5 GBps throughput.

How-to
^^^^^^

In order to run KloudBuster Standard Profiling, you have to set up below
configurations:

1. Enable progression runs:

    Running from CLI: Edit the config file, and set
    **client:progression:enabled** to True

    Running from Web UI: Navigate to "Interactive Mode" from the top menu
    bar, unfold the left panel for detail settings, under "Progression Test"
    section, and check the "Progression Test" checkbox.

2. Set up the max scale:

    The max scale basically means the max VM counts that KloudBuster will
    try to reach. For a typical 10GE NIC card with VLAN encapsulation,
    25 will be a good value. Adjust it to a reasonable value based on
    your deployment details.

    Running from CLI: Edit the config file, and set **server:vms_per_network**
    to a proper value.

    Running from Web UI: Navigate to "Interactive Mode" from the top menu
    bar, unfold the left panel for detail settings, under "Staging Settings"
    section, and set "VMs/Network" to a proper value.


Intepret the results
^^^^^^^^^^^^^^^^^^^^

From the CLI, check the log and find the warning that KloudBuster gave,
similar to this::

    WARNING KloudBuster is stopping the iteration because the result reaches the stop limit.

One line before is the json output of last successful run, which has the
number in the "total_server_vms" field.

From the Web UI, in ihe "Interactive Mode" tab, you will see how many sets
of data are you getting. The second last set of data shows the last successful
run, which has the number in the "Server VMs" column.

