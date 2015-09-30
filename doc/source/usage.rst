=====
Usage
=====

Quick Start Guide
-----------------

This guide will allow you to run KloudBuster on your OpenStack cloud using the default scale settings which is generally safe to run on any cloud, small or large (it should also work on an all-in-one devstack cloud installation).

The minimal pre-requisites to run KloudBuster:
    * Admin access to the cloud under test
    * 3 available floating IPs

Step 1
^^^^^^

Download the openrc file from OpenStack Dashboard, and saved it to your local file system. (In Horizon dashboard: Project|Acces&Security!Api Access|Download OpenStack RC File)

Step 2
^^^^^^

Run KloudBuster with the default configuration. The default scale settings can be displayed from the command line using *--show-config* option.

By default KloudBuster will run on a single cloud mode and create:
    * 2 tenants, 2 users, and 2 routers;
    * 1 shared network for both servers and clients tenants
    * 1 VM running as an HTTP server
    * 1 VM running the Redis server (for orchestration)
    * 1 VM running the HTTP traffic generator (default to 1000 connections, 1000 requests per second, and 30 seconds duration)

Run kloudbuster with the following options::

    kloudbuster --tested-rc <path_to_the_admin_rc_file> --tested-passwd <admin_password>

The run should take couple of minutes (depending on how fast of the cloud to create resources) and you should see the actions taken by KloudBuster displayed on the console. Once the test is done, all resources will be cleaned up and results will be displayed.

.. note:: Once this minimal scale test passes, you can tackle more elaborate scale testing by increasing the scale numbers or providing various traffic shaping options. See below sections for more details.


Configure KloudBuster
---------------------

The default configuration can be displayed on the command line console using the *--show-config* option. It is easy to have a custom configuration by redirecting the output to a custom file, modifying that
file and passing it to the KlousBuster command line using the *--config* option.

Note that the default configuration is always loaded by KloudBuster and any default option can be overriden by providing a custom configuration file that only contains modified options.


Advanced Features
-----------------

Control the VM Placement
^^^^^^^^^^^^^^^^^^^^^^^^

By default, VMs are placed by NOVA using its own scheduling logic. However, traffic can be shaped precisely to fill the appropriate network links by using specific configuration settings. KloudBuster can change that behavior, and force NOVA to place VMs on desired hypervisors as we defined by by supplying the topology file.

The format of the topology file is relatively simple, and group into two sections. See file "cfg.topo.yaml" for an example.

The "servers_rack" section contains the hypervisors that the server side VMs will be spawned on, and the "clients_rack" section contains the hypervisors that the client side VMs will be spawned on. The hypervisor names can be obtained from Horizon dashboard, or via "*nova hypervisor-list*". Note that the name in the config files must exactly match the name shown in Horizon dashboard or NOVA API output.

A typical use case is to place all server VMs on one rack, and all client VMs on the other rack to test Rack-to-Rack performance. Similarly, all server VMs on one host, and all client VMs on the other host to test the Host-to-Host performance.

To use this feature, just pass *-t <path_to_topo_file>* to the kloudbuster command line.

.. note:: Admin access is required to use this feature.


Running KloudBuster without admin access
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When there is no admin access to the cloud under test, KloudBuster does support to run and reused the existing tenant and user for running tests. You have to ask the cloud admin one time to create the resources in advance, and KloudBuster will create the resources using the pre-created tenant/user.

When running under the tenant/user reusing mode:
    * Only one tenant will be used for hosting both server cloud and client cloud resources;
    * Only two users will be used for creating resources, and each cloud has its own user;

And also there are some limitations that you should aware:
    * The VM placement feature will not be supported;
    * The flavor configs will be ignored, and the KloudBuster will automatically pick the closest flavor settings from the existing list;
    * KloudBuster will not automatically adjust the tenant quota, and give warnings when quota exceeded;

See file "cfg.tenants.yaml" for an example. Modify the settings to match your cloud.

To use this feature, just pass *-l <path_to_tenants_file>* to the kloudbuster command line.
