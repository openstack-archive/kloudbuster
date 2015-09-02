========
Usage
========

Quick Start Guide
-----------------

This guide will allow you to run KloudBuster on your OpenStack cloud using the default scale settings which is generally safe to run on any cloud, small or large (it should also work on an all-in-one devstack cloud installation).

Minimal pre-requisites
^^^^^^^^^^^^^^^^^^^^^^

	* install KloudBuster (see instructions in the Installation section)
	* admin access to the cloud under test
	* download an admin rc file from the cloud under test using Horizon dashboard 
	* 3 available floating IPs

Download an admin rc file::
	Login to the Horizon dashboard of the cloud under test as admin, then go to the Projects, Access and Security, API Access.
	Click on the "Download OpenStack RC File" button and note down where that file is downloaded by your browser.

The default scale settings can be displayed from the command line using the --show-config option. 
By default KloudBuster will run on a single cloud and create:

* 1 tenant, 1 user, 2 routers, 1 network, 1 VM running as an HTTP server
* 1 VM running the Redis server (for orchestration)
* 1 VM running the HTTP traffic generator with 1000 connections and a total of 500 requests per second for 30 seconds

Once done, all resources will be cleaned up and results will be displayed.
In this minimal test, VMs are placed by Nova using its own scheduling logic. In more advanced usages, traffic can be shaped precisely to fill the appropriate network links by using specific configuration settings.

Start KloudBuster
^^^^^^^^^^^^^^^^^

To list all command line options, pass --help.

Run kloudbuster with the following options:

.. code::
	
	kloudbuster --tested-rc <path of the admin rc file> --tested-passwd <admin password>

The run should take around a minute (depending on how fast is the cloud to create resources) and you should see the actions taken by KloudBuster displayed on the console, followed by the scale results.

Once this minimal scale test passes you can tackle more elaborate scale testing by increasing the scale numbers or providing various traffic shaping options.


Configuration File
------------------
The default configuration can be displayed on the command line console using the --show-config option.
It is easy to have a custom configuration by redirecting the output to a custom file, modifying that
file and passing it to the KlousBuster command line using the --config option.
Note that the default configuration is always loaded by KloudBuster and any default option can be overriden by providing a custom configuration file that only contains modified options.


