==========================
Frequently Asked Questions
==========================


KloudBuster in a nutshell?
--------------------------
 
A self contained, fully automated and open source OpenStack VM-level tenant
network and storage scale measurement tool.

Why is a tool like KloudBuster useful?
--------------------------------------

Before KloudBuster it was practically very difficult and time consuming to load
an OpenStack cloud at a scale that reflects large deployments with traffic on
the data plane or the storage plane and to measure its impact where it counts:
at the VM application level. To the point that practically very few people would
take the pain of conducting such experiment except perhaps for very small scale
setups (such as single rack, 2 compute nodes). Just to give an idea, to
replicate manually what a 15-minute KloudBuster run can do on a medium size
cloud (2 racks, less than 100 nodes and 40GE links), would require at the very
least several days of hard-to-repeat work assuming the person doing that test
knows how to do all the different small tasks needed to obtain similar results:

- create a VM image with the appropriate test packages (not trivial to find
  which packages to use)
- create all the tenants/users/routers/resources/VMs
- place the VMs in a way that makes sense for scale testing (such as rack based
  placement)
- provision the test VMs with the right configuration
- orchestrate the test VMs to start at the same time (cannot be manual due to 
  the scale, we're talking about hundreds of client VMs to coordinate)
- repatriate all the results from all the client VMs when the test is finished
  (which itself can represent a very large amount of data)
- consolidate all the results in a way that makes sense system wise and is easy 
  to interpret
- present results in a nice digestible format

And this is just for the simplest of the KloudBuster runs. Dual cloud scale
testing (where 1 testing cloud loads the cloud under test to scale up the North
South traffic) requires juggling with 2 OpenStack clouds at the same time,
KloudBuster handles that mode by design and as easily as the single-cloud scale
test. Latest features add support for periodic reporting (e.g. latency stats
every 5 seconds), server mode with RESTFUL API control by external orchestrators
(this is required for any form of automated HA testing) or scale progressions
(e.g. collect latency numbers for 10,000 clients to 200,000 clients by increment
of 10,000 clients, at that level of scale recreating every resource set from
scratch at every iteration is going to take too much time). All of these
advanced features are clearly impossible to do manually or semi-manually.

What do you mean by comprehensive end to end scale testing?
-----------------------------------------------------------
 
You could start with a completely idle OpenStack cloud with zero resources and
zero data plane traffic (as if you just deployed OpenStack on it). Within
minutes you have a cloud that is fully loaded with tenants, users, routers,
networks, VMs and with all network pipes filled to capacity (if the network
architecture and configuration is tuned properly) with a massive amount of live
HTTP traffic or storage traffic. After the test, you revert back to the original
idle state and you have a nice HTML report with the data plane characterization
of your cloud or charts representing the scalability of your storage back end
viewed from VM applications.


How scalable is KloudBuster itself?
-----------------------------------

All the runs so far have shown bottlenecks residing in the cloud under test.
KloudBuster is designed to scale to an extremely large number of VM end points
thanks to the use of an efficient distributed key value store and the associated
publish/subscribe service (Redis) for the scale orchestration. Redis has shown
to scale to thousands of subscribers without any problem while more traditional
scaling tools that use SSH to control the end points will have trouble keeping
up past a few hundred sessions.


General Usage Questions
-----------------------

Is there a way to prevent KloudBuster from deleting all the resources?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In cfg.scale.yaml, there is a “cleanup_resources” property which is True by
default. Set it to False and KloudBuster won’t clean up the resources after the
run.
 
Is there a way to cleanup all lingering resources created by KloudBuster?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

All resources created by KlousBuster have a "KB\_" prefix in their name. The
“force_cleanup” script will clean up all resources that have a name starting
with "KB\_".
 
How are KloudBuster VM images managed?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

KloudBuster VM images are built using OpenStack diskimage-builder (or DIB) and
have a version (single number). 

Starting from version 7.0.0
^^^^^^^^^^^^^^^^^^^^^^^^^^^
The name of the VM image is "kloudbuster-<version>" (e.g. "kloudbuster-7.0.0").
That image is now always included in the container image (which is why it is big).
When running KloudBuster from the container, it will automatically upload
that VM image from the local copy in the container.

Prior to version 7.0.0
^^^^^^^^^^^^^^^^^^^^^^
The default name of an image is
"kloudbuster_v<version>" (e.g. "kloudbuster_v6"). Normally each KloudBuster
application is associated to a recommended KloudBuster VM image version.

This is indicated in the output of --version::

  $ python kloudbuster.py --version  
  6.0.3, VM image: kloudbuster_v6  
 
In this example, the KloudBuster application is version 6.0.3 and the matching
VM image is v6. By default KloudBuster will use the Glance image that is named
"kloudbuster_v6" (this can be overridden in the configuration file).
 
Note that if the user specifies a different VM image version in the
configuration file, a warning will be issued to indicate that there might be
some incompatibilities (but the run will proceed):

::

    2015-08-26 10:47:10.915 38100 INFO kb_runner [-] Waiting for agents on VMs to come up...  
    2015-08-26 10:47:15.918 38100 INFO kb_runner [-] 0 Succeed, 0 Failed, 1 Pending... Retry #0  
    2015-08-26 10:47:20.920 38100 INFO kb_runner [-] 1 Succeed, 0 Failed, 0 Pending... Retry #1  
    2015-08-26 10:47:20.961 38100 WARNING kb_runner [-] The VM image you are running (2.0) is not the expected version (6) this may cause some incompatibilities  
 
It is recommended to always use the appropriate VM image version to avoid any
potential incompatibility.

HTTP Data Plane Testing
-----------------------
 
How many TCP connections exactly are created, how many requests are generated and how long do the connections stay?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

KloudBuster will create the exact number of HTTP connections configured and will
keep them active and open until the end of the scale test. There is a 1:1
mapping between an HTTP connection/client and 1 TCP connection (the same TCP
connection is reused for all requests sent by the same client). For example,
with 100 HTTP servers, 1000 HTTP connections and 500 HTTP requests/sec per HTTP
server, the total number of simultaneous HTTP connections will be 100,000 at any
time during the scale test and the number of HTTP requests generated will be
50,000 rps.
 
Why pick wrk2 to generate HTTP traffic?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This tool was chosen among many other open source tools because it was tested to
be the most scalable (highest number of connections/rps per CPU) and provided
very accurate HTTP throughput and latency results (which cannot be said of most
other tools - see FAQ on how latency is calculated).

Storage Scale Testing
---------------------

What kind of VM storage are supported?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

KloudBuster cam measure the performance of ephemeral disks and Cinder attached
volumes at scale.

How to measure the fastest IOPs or Throughput from a VM ?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This feature is only available from the CLI by using a properly defined configuration file.
To measure the fastest IOPs, omit the "rate_iops" and "rate" parameters from the
workload definition in the configuration file.

The file kloudbuster/cfg.1GB.yaml provides and example of configuration file to measure
the highest IOPs and throughput for random/sequential, read/write for 1 VM on 1 1GB file
residing on an attached volume.

How to interpret the generated results in json?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

General parameters:

- test_mode: is always "storage" 
- storage_target: indicates if the storage used is a Cinder block storage ("volume") or an ephemeral disk, 
- time: time the test was executed
- version: KloudBuster version
- tool: the FIO version used to generate the results
- block_size: the unit in the value indicates the unit (e.g "4k" = 4 kilobytes)
- iodepth: number of in-flight operations, 
- total_client_vms: total number of VMs running an FIO client
- timeout_vms: number of VM/fio clients that did not return a result within the allocated time 
  (this parameter is absent if there was no VM timing out, should not be present for most runs) 


These parameters represent aggregated values for all VMs (to get a per VM count, divide the value by the number of
client Vms (total_client_vms):

- read_runtime_ms, write_runtime_ms: aggregated time the fio tests ran in msec as measured by fio
- rate_iops: aggregated requested number of IOPs, 0 or missing = unlimited (i.e. test as high as possible)
- read_iops, wrote_iops: aggregated read or write IO operations per second as measured by fio
  (if rate_iops is not zero, will be <= rate_iops)
- rate: aggregated requested kilobytes per second, 0 or missing = unlimited (i.e. test as high as possible)
- read_bw, write_bw: aggregated read or write bandwidth in KB/sec 
  (if rate is not zero, will be <= rate)
- read_KB, write_KB: aggregated number of kilobytes read or written as measured by fio

Latency values are reported using a list of pre-defined percentiles:

- read_hist: a list of pairs where each pair has a percentile value and a latency value in micro-seconds
  e.g. [99.9, 1032] indicates that 99.9% of all I/O operations will take 1032 usec or less to complete


Common Pitfalls and Limitations
-------------------------------

AuthorizationFailure and SSL Exception when running KloudBuster
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

::

  2016-05-12 17:20:30 CRITICAL AuthorizationFailure: Authorization Failed: SSL exception connecting to https://172.29.86.5:5000/v2.0/tokens: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed (_ssl.c:765)

This exception most likely indicates that the OpenStack API uses SSL and that
the CA certificate file is missing in the openrc file used. Check that the
openrc file used:

- has OS_AUTH_URL using https
- either has OS_CACERT missing or pointing to an invalid or missing certificate
  file path

To fix this you will need to have the OS_CACERT variable in your openrc file
point to a valid certificate file (you will need to get this certificate file
from the cloud admin).


Creating the image with diskimage-builder fails with an "import yaml" error
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This error means that the python PyYAML package is not installed or that your
/etc/sudoers file is configured in a way that causes a sudo script in diskimage-
builder to fail. To check if PyYAML is installed: pip list  | grep PyYAML If
PyYAML is installed, comment out this  line in /etc/sudoers (use "sudo visudo"
to modify that file):

.. code-block:: bash

    #Defaults   secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"   


