=====
Usage
=====

There are three ways for running KloudBuster, the easiest 
being the **Web UI**. It offers the most user friendly interface and
needs the least learning to get started. **CLI** is the traditional way
to run applications. It has the most comprehensive feature sets when compared
to the other two ways. **Rest API** gives another way to access
and control KloudBuster from another application.
The built-in Web UI is fully implemented on top of the REST API.

The default scale settings of KloudBuster is at minimal scale, which is
generally safe to run on any cloud, small or large. It should also work on
an all-in-one devstack cloud installation as well. The minimal pre-requisites
to run KloudBuster:

    * Admin access to the cloud under test (non-admin might work with some tweaks and limitations)
    * 3 available floating IPs (for HTTP data plane test only)

Regardless of the way you launch KloudBuster, you will need the access info and the credentials to the cloud under test.
This information can be downloaded from a Horizon dashboard
(Project|Acces&Security!Api Access|Download OpenStack RC File). Save it to
your local filesystem for future use.


Running KloudBuster as a Web/REST Server
----------------------------------------

Starting the KloudBuster Server from a VM Image
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The easiest way to use KloudBuster is to run it as a web server application running in a VM.
The pre-built KloudBuster qcow2 image contains the Web server and is ready to service HTTP and REST requests once up and running. 
To get the KloudBuster Web server running in any OpenStack cloud:

1. Follow the steps :ref:`here <upload_kb_image>` to upload the KloudBuster
   image to the openstack cloud that will host your KloudBuster web server
   (note that this could be the same as the cloud under test or could be a different cloud)

2. If necessary, and as for any VM-based web server application bringup, create and configure the Neutron router and network 
   where the KloudBuster web server VM instance will be attached

3. Create or reuse a security group which allows ingress TCP traffic on
   port 8080

4. Launch an instance using the KloudBuster image，with the proper security group
   and connect to the appropriate network. Leave the
   Key Pair as blank, as we don't need the SSH access to this VM

5. Associate a floating IP to the newly created VM instance so that it can be accessible from
   an external browser

The base URL to use for REST access is::

    http://<floating_ip>:8080


The Web UI URL to use from any browser is::

    http://<floating_ip>:8080/ui/index.html


Starting the KloudBuster Server from a git clone
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you use git clone, you can bring up the KloudBuster Web/REST server fron the CLI.
KloudBuster uses the 
`Pecan <http://www.pecanpy.org/>`_ web server to host both the KloudBuster REST 
server and the KloudBuster front-end website (which listens to
port 8080 by default).

From the root of the KloudBuster repository, go to the kb_server directory.
Then start the server by doing::

    $ pecan serve config.py

You should see a message similar to the one below, which indicates the server
is up running::

    Starting server in PID 26431
    serving on 0.0.0.0:8080, view at http://127.0.0.1:8080

Using the KloudBuster Web UI
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Using any browser, point to the provided URL at port 8080. You will get a Login page where you will need to enter

   * the type of scale test (HTTP data plane or storage)
   * the credentials openrc file of the cloud under test


Interacting with the KloudBuster Server REST Interface
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Once the server is started, you can use different HTTP methods
(GET/PUT/POST/DELETE) to interact with the KloudBuster REST interface using the provided URL at port 8080.

`KloudBuster REST API Dcumentaton <https://github.com/openstack/kloudbuster/blob/master/doc/source/_static/kloudbuster-swagger.html>`_


Running the KloudBuster HTTP Data Plane Scale Test from CLI
-----------------------------------------------------------
If you do not really need a Web UI or REST interface, you can simply run KloudBuster scale test straight from CLI.

KloudBuster is ready to run with the default configuration, which can be
displayed from the command line using *--show-config* option. By default,
KloudBuster will run on a single cloud and run the default HTTP data plane scale test:

    * create 2 tenants, 2 users, and 2 routers;
    * create 1 shared network for both servers and clients tenants
    * create 1 VM running as an HTTP server
    * create 1 VM running the Redis server (for orchestration)
    * create 1 VM running the HTTP traffic generator (default to 1000 connections,
      1000 requests per second, and 30 seconds duration
    * measure/aggegate throughput and latency 
    * bring down and cleanup


Run KloudBuster with the following options::

    kloudbuster --tested-rc <path_to_the_admin_rc_file> --tested-passwd <admin_password>

The run should take couple of minutes (depending on how fast the cloud can create the resources)
and you should see the actions taken by KloudBuster
displayed on the console.

Once this minimal scale test passes, you can tackle more elaborate scale
testing by increasing the scale numbers or providing various traffic shaping
options. See below sections for more details about configuring KloudBuster.


KloudBuster Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^

To create a custom scale test configuration, make a copy of the default configuration
and modify that file to satisfy our own needs. A copy of the default configuration can
be obtained by redirecting the output of *--show-config* to a new file.
Once done, provide that custom configuration file to the KloudBuster command line using the *--config <file>* option.

.. note::

    Note that the default configuration is always loaded by KloudBuster and
    any default option can be overridden by providing a custom configuration
    file that only contains modified options. So you can delete all the lines 
    in the configuration file that you do not intend to change

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
generated. Below are the two values which determine the traffic::

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


<<<<<<< 18e555dbd3ff384ff34baa341b2dfa544eaae760
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

All Rest APIs are well documented using `Swagger <http://swagger.io/>`_. In
order to view them in a nice format, copy the entire contents of file
kb_server/kloudbuster-swagger.yaml, and paste into the left panel of
http://editor.swagger.io. Then you will see the specification of all Rest
APIs in the right panel of the web page.

A static HTML version can be found 
`here <https://github.com/openstack/kloudbuster/blob/master/doc/source/_static/kloudbuster-swagger.html>`_.

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
=======
Displaying the Results
^^^^^^^^^^^^^^^^^^^^^^
>>>>>>> Update doc for storage

Results can be saved in a file in json format or in html format. The json format is more appropriate for usage by any post-processing tool or script
while the html file is more adapted for human usage.

The KloudBuster Web UI will display the results using charts and tables when the test is finished running.
The KloudBuster CLI provides an option to generate the html file from the results (--html option).
It can also generate the html file from the json results (--charts-from-json option).


KloudBuster Standard Scale Profile
----------------------------------

Multiple factors can impact data plane scale numbers measured by KloudBuster:
VM count, number of connections per VM, number of requests per
seconds per VM, timeout, etc...
To help obtaining quick and easy results without having to tweak too many parameters,
KloudBuster defines an off the shelf *default scale profile*.

In the default scale profile:

- the number of connections per VM will be set to 1000,
- the number of requests per seconds per VM is set to 1000, 
- the HTTP request timeout is set to 5 seconds. 
- the stop limit for progression runs will be error packets greater than 50. 
- The size of the HTML page in the server VMs will be 32768 Bytes. 

In order to perform a run using the default scale profile, set the max VM counts for the test,
enable progression run and leave everything else with their default values.
KloudBuster will start the iteration until
reaching the stop limit or the max scale. Eventually, once the KloudBuster
run is finished, the cloud performance can be told by looking at how many VMs
KloudBuster can run to and by looking at the latency charts.

As a reference, KloudBuster can run approximately 21 VMs (with 21,000 connections and 21,000 HTTP requests/sec)
and achieve approximately 5 Gbps of HTTP throughput on
a typical multi-node Kilo OpenStack deployment (LinuxBridge + VLAN, 10GE NIC card).

How-to
^^^^^^

In order to run KloudBuster Standard Scale Profile, you have to set up below
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


Interpret the results
^^^^^^^^^^^^^^^^^^^^^

From the CLI, check the log and find the warning that KloudBuster gave,
similar to this::

    WARNING KloudBuster is stopping the iteration because the result reaches the stop limit.

One line before is the json output of last successful run, which has the
number in the "total_server_vms" field.

From the Web UI, in ihe "Interactive Mode" tab, you will see how many sets
of data are you getting. The second last set of data shows the last successful
run, which has the number in the "Server VMs" column.


Running the KloudBuster Storage Scale Test from CLI
---------------------------------------------------

To run the storage scale test you need to pass the following options on the command line.

--storage::

    this option enables the storage scale test (and disables the http data plane scale test)

--tested-rc::

    to provide the OpenStack openrc credential file to use

--tested_passwd::

    to provide the OpenStack password

--json (optional)::

    save results in the passed json file

--html (optional)::

    generate results in HTML format with Javascript charts


Example of run (git clone, with pip install you can directly invoke the kloudbuster wrapper script instead of "python kloudbuster.py")::

    python kloudbuster.py --tested-rc ../../aio-openrc.sh --tested-passwd lab --storage --json ../../aio.json

A custom configuration file can be created and modified to adjust several storage scale test parameters (use the *--show-config* option and redirect to a new custom configuration file then pass it using *--config*):

server|vms_per_network::

    specify how many VMs you want to test for storage access

client|progression::

    can be enabled to get progression scale numbers for storage test

client|storage_tool_configs::

    can be modified to fit the exact storage workload suite you want to test

client|volume_size::

    size of the Cinder volume to be attached to each VM instance (in GB)

client|io_file_size::

    size of the test file to be used for the storage tests (in GB)



