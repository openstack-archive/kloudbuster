==============================================
KloudBuster Docker Container Quick Start Guide 
==============================================

The KloudBuster Docker container provides a quick way to use KloudBuster if you
are already familiar with Docker.

Prerequisites
-------------

This quick start guide assumes you have already installed Docker.  All command
line examples below are based on Linux (which could be either native or in a
VM) and require Internet access to Docker Hub.


1. Pull latest Docker container image
-------------------------------------

KloudBuster is available as a container in Docker Hub at 
`berrypatch/kloudbuster <https://hub.docker.com/r/berrypatch/kloudbuster/>`_

.. code-block:: bash

    $ docker pull berrypatch/kloudbuster

2. Get the openrc file from your OpenStack Horizon dashboard
------------------------------------------------------------

Using the Horizon dashboard, download the openrc file (Project|Compute|API
Access then click on "Download OpenStack RC File").  It is best to use the
admin user to run KloudBuster as much as possible (otherwise there are
restrictions on what you can do).  Instructions below assume a copy of that
file is saved under the local directory with the name "admin-openrc.sh"


3. Upload the KloudBuster VM image to the cloud under test
----------------------------------------------------------
If your OpenStack cloud has full access to the Internet, you can skip this step
as KloudBuster will instruct Glance to download the KloudBuster VM inage
directly from the OpenStack (skip to next step).

Otherwise, :ref:`download the latest kloudbuster image <upload_kb_image>` from
the OpenStack App Catalog.

In addition to the method described to upload the image using the Horizon
dashboard or the glance CLI, you can also use the glance CLI that is already
available in the KloudBuster container.  Start a bash shell in the container
and map the local directory to '/opt/kb' in the container so that you have
access to the image and the RC file:

.. code-block:: bash

   docker run -v $PWD:/opt/kb --rm -it berrypatch/kloudbuster bash

Then from inside the container bash prompt, source the openrc file, invoke the
glance CLI to upload the VM image (should take a few minutes) then exit and
terminate the container:

.. code-block:: bash

   source /opt/kb/admin-openrc.sh
   glance image-create --name "kloudbuster_v6" --visibility public --disk-format qcow2  --container-format bare --file /opt/kb/kloudbuster_v6.qcow2

Now you should be back to the host and should see the kloudbuster image in the
current directory.

4. Running the KloudBuster CLI
------------------------------

If you do not really need a Web UI or REST interface, you can simply run
KloudBuster scale test straight from CLI in the container.

.. code-block:: bash

   docker run -v $PWD:/opt/kb --rm -t berrypatch/kloudbuster kloudbuster -h


We assume in the below example that you have an openrc file available called
"admin-openrc.sh" in the local directory and that the corresponding OpenStack
password is "admin".


Run the default HTTP data plane scale test
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default HTTP scale test is described :ref:`here <default_http_scale>`.

.. code-block:: bash

    docker run --rm -t -v $PWD:/opt/kb berrypatch/kloudbuster kloudbuster --tested-rc /opt/kb/admin-openrc.sh --tested-passwd admin

Run the default storage scale test
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default storage scale test is described :ref:`here <default_storage_scale>`.

.. code-block:: bash

    docker run --rm -t -v $PWD:/opt/kb berrypatch/kloudbuster kloudbuster --tested-rc /opt/kb/admin-openrc.sh --tested-passwd admin --storage


Run KloudBuster with a custom configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To get a copy of the default KloudBuster configuration and store it to a file
called "kb.cfg":

.. code-block:: bash

    docker run --rm berrypatch/kloudbuster kloudbuster --show-config >/opt/kb/kb.cfg
    less kb.cfg

You can then edit kb.cfg and modify it appropriately. To run KloudBuster with
the custom configuration, simply pass it to container after mapping the host
local directory to "/opt/kb" (for example):

.. code-block:: bash

    docker run --rm -t -v $PWD:/opt/kb berrypatch/kloudbuster kloudbuster --tested-rc /opt/kb/admin-openrc.sh --tested-passwd admin --config /opt/kb/kb.cfg

5. Running KloudBuster as a WebUI/REST Server
---------------------------------------------

By default KloudbBuster will listen on port 8080 in the container. This port
must be mapped to a host level port using the -p argument. For example, to use
the same port number at the host level:

.. code-block:: bash

    docker run -p 8080:8080 --rm berrypatch/kloudbuster kb_start_server&

The first port number is the host listen port (any port of your choice) while
the second one after the column is the container listen port (always 8080 for
KloudBuster). For example, to use port 9090 on the host and map it to the
KloudBuster port in the container, you would use -p 9090:8080

To stop the KloudBuster container, you can use the "docker kill <id>" command.

Assuming the host port used is 8080, the Web UI URL to use from any browser is::

    http://<host_ip>:8080

The KloudBuster REST base URL is the above URL with "/api" appended::

    http://<host_ip>:8080/api

:ref:`How to use the Web UI <webui_usage>`

:ref:`How to use the REST interface <rest_usage>`

