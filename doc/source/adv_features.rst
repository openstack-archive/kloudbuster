=================
Advanced Features
=================

Control the VM Placement
------------------------

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
----------------------------------------

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


Displaying the Results
----------------------

Results can be saved in a file in json format or in HTML format. The json format
is more appropriate for usage by any post-processing tool or script while the
HTML file is more adapted for human usage.

The KloudBuster Web UI will display the results using charts and tables when the
test is finished running.  The KloudBuster CLI provides an option to generate
the HTML file from the results (*--html* option).  It can also generate the HTML
file from the JSON results (*--charts-from-json* option).


Examples of running KloudBuster
-------------------------------

Assuming the OpenStack RC file is stored at ~/admin_openrc.sh, and the
password is "admin". Running the program is relatively easy, some examples
are given to help get started quickly.

.. note::

    Before going to large scale test, it is strongly recommended to start with
    a small scale. The default config is a good point to start with. It will
    make sure KloudBuster is talking to the clouds well.


Example 1: HTTP Scale, Single-cloud Mode
""""""""""""""""""""""""""""""""""""""""

Kloudbuster will create both server VMs and client VMs in the same cloud if
only one RC file is provided::

    $ kloudbuster --rc ~/admin_openrc.sh --passwd admin


Example 2: HTTP Scale, Dual-cloud Mode, Save results
""""""""""""""""""""""""""""""""""""""""""""""""""""

Assume the cloud for server VMs is ~/admin_openrc1.sh, and the cloud for
client VMs is ~/admin_openrc2.sh. The password for both clouds is "admin".
Also save the results to a JSON file once the run is finished::

    $ kloudbuster --rc ~/admin_openrc1.sh --passwd admin --testing-rc ~/admin_openrc2.sh --testing-passwd admin --json result.json


Example 3: HTTP Scale, Single-cloud Mode, Customized VM placements
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

.. code::

    $ kloudbuster --rc ~/admin_openrc.sh --passwd admin -t cfg.topo.yaml


Example 4: Storage benchmark, Save results to JSON
""""""""""""""""""""""""""""""""""""""""""""""""""

.. code::

    $ kloudbuster --rc ~/aio-openrc.sh --passwd lab --storage --json aio.json



