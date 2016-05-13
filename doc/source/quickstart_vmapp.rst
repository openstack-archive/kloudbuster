============================================
KloudBuster VM Application Quick Start Guide
============================================

The pre-built KloudBuster qcow2 VM image contains the KloudBuster Web server
and is ready to service HTTP and REST requests once up and running. To get the
KloudBuster Web server running in any OpenStack cloud:

1. Upload the KloudBuster VM image
----------------------------------

Follow the :ref:`steps <upload_kb_image>` to upload the KloudBuster VM image
to the OpenStack cloud that will host your KloudBuster web server

.. note::
   The KloudBuster web server can run in the cloud under test or in another
   OpenStack cloud.

2. Create a Neutron tenant router and network
---------------------------------------------

If necessary, and as for any VM-based web server application bring up, create
and configure the Neutron router and network where the KloudBuster web server
VM instance will be attached.
You can also reuse an existing tenant network and router.

3. Create a Security Group
--------------------------

Create or reuse a security group which allows ingress TCP traffic on port 8080.

4. Launch the KloudBuster VM Application
----------------------------------------

Launch an instance using the KloudBuster image with the proper security group,
and connect to the appropriate network. Leave the Key Pair as blank, as we
don't need the SSH access to this VM.

5. Associate a floating IP
--------------------------

Associate a floating IP to the newly created VM instance so that it can be
accessible from an external browser

6. Connect to the web UI with a browser
---------------------------------------

The Web UI URL to use from any browser is::

    http://<floating_ip>:8080

The base URL to use for REST access is::

    http://<floating_ip>:8080/api

7. Download the openrc file
---------------------------

Using the Horizon dashboard, download the openrc file (Project|Compute|API
Access then click on "Download OpenStack RC File"). It is best to use the
admin user to run KloudBuster as much as possible (otherwise there are
restrictions on what you can do).

8. Login to KloudBuster
-----------------------

Follow :ref:`instructions <webui_usage>` on how to use the web UI.

