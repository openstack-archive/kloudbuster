============================
Usage and Quick Start Guides
============================

KloudBuster User Interfaces
---------------------------
KloudBuster provides 3 interfaces, the easiest being the **Web User Interface**.
It offers the most user friendly interface and needs the least learning to get
started. **CLI** is the traditional way to run applications. It has the most
comprehensive feature sets when compared to the other methods. **REST API**
gives another way to access and control KloudBuster from another application.

The Web UI is fully implemented on top of the REST API.

OpenStack Cloud Pre-Requisites
------------------------------
OpenStack cloud pre-requisites to run KloudBuster:

    * Neutron networking
    * Admin access to the cloud under test (non-admin might work with some
      tweaks and limitations)
    * 3 available floating IPs if running the HTTP data plane scale test
    * 2 available floating IPs if running the Storage scale test

KloudBuster Installation Options
--------------------------------

There are 4 different ways to install KloudBuster:

- use a pre-built Docker container (recommended if you already use Docker)
- use a pre-built VM image (if you prefer to run the KloudBuster application in a VM and do not need CLI)
- install from PyPI (if you prefer to use pip install)
- install directly from GitHub (git clone, for code development or if you want to browse the code)

Users of KloudBuster who prefer to use the CLI or who prefer to run KloudBuster
locally on their workstation or laptop can use the PyPI based installation
(pip install) or the Docker container.

Docker container, Web Service and PyPI based installation will satisfy most use cases
and are the recommended ways for running KloudBuster under production environments
or through an automated or scheduled job.


Quick Start Guides
------------------
.. toctree::
   :maxdepth: 2

   quickstart_docker
   quickstart_pip
   quickstart_vmapp
   quickstart_git

.. _webui_usage:

Using the KloudBuster Web UI
----------------------------

Using any browser, point to the provided URL. You will get a Login page where
you will need to enter:

   * The type of scale test (HTTP data plane or storage)
   * The location of the openrc file for the cloud under test and the corresponding
     OpenStack password

You could modify the scale test configuration options or simply start the scale
test with the default scale configuration.  Click on Stage button to instruct
KloudBuster to stage all the OpenStack resources. This can take time depending
on how many VMs are requested and how fast is the cloud under test.

Once staging is done, click on the Run button to run the scale test.

.. _rest_usage:

Interacting with the KloudBuster REST Interface
-----------------------------------------------

REST Documentation
^^^^^^^^^^^^^^^^^^

Once the server is started, you can use different HTTP methods
(GET/PUT/POST/DELETE) to interact with the KloudBuster REST interface using the
provided URL at port 8080.

    * `KloudBuster REST API Documentation Preview <https://htmlpreview.github.io/?https://github.com/openstack/kloudbuster/blob/master/doc/source/_static/kloudbuster-swagger.html>`_
    * `REST API Documentation (Swagger yaml) <https://github.com/openstack/kloudbuster/blob/master/kb_server/kloudbuster-swagger.yaml>`_

Examples of REST requests
^^^^^^^^^^^^^^^^^^^^^^^^^

.. _upload_kb_image:

KloudBuster VM Image Upload
---------------------------

Before you can use KloudBuster you must upload the KloudBuster VM image to your
OpenStack cloud under test.  KloudBuster needs one "universal" test VM image
(referred to as "KloudBuster image") that contains the necessary test software.
The KloudBuster image is then instantiated by the KloudBuster application in
potentially large number of VMs using the appropriate role (HTTP server, HTTP
traffic generator...).

Pre-built VM images are available for download from the
`OpenStack App Catalog <http://apps.openstack.org/#tab=glance-images>`_.

.. note::

   The same KloudBuster VM image can be instantiated for running the test functions
   (HTTP servers, HTTP traffic generators, file access tools) and for running KloudBuster as a web service.

.. note::

    If your OpenStack Glance is able to access the Internet and you only use
    the CLI to launch KloudBuster, you can skip this section (KloudBuster CLI
    will request Glance to download the image from the OpenStack App Catalog when
    it is not present in Glance).

Download the KloudBuster VM image to the local directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You must download a local copy if your OpenStack cloud does not have dirct
access to the Internet.  Download the latest image directly from
`OpenStack App Catalog <http://apps.openstack.org/#tab=glance-images>`_ using
your favorite browser (search for "kloudbuster") or using wget.  KloudBuster VM
images are qcow2 images named "kloudbuster_v<version>.qcow2" (e.g.
"kloudbuster_v6.qcow2"). Look for an image named with the "kloudbuster_v"
prefix and download the latest version from the list.

Example for downloading the v6 image using wget:

.. code-block:: bash

   wget http://storage.apps.openstack.org/images/kloudbuster_v6.qcow2

Upload the KloudBuster VM image using the Horizon Dashboard
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

From the dashboard, create a new image and select either "Image File" if you
want to uplaod from the local copy of the image or "Image Location" if you want
to upload directly from the OpenStack App Catalog (you will need the complete
URL of the image).

The name of the image in Glance *must* match exactly the image name in the App
Catalog (without the .qcow2 extension, e.g. "kloudbuster_v6").

Upload the KloudBuster VM image using the Glance CLI
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This assumes that you have installed the OpenStack Glance API and have sourced
the appropriate openrc file.

To upload the image from a local copy of that image using the Glance CLI:

.. code-block:: bash

    glance image-create --file kloudbuster_v6.qcow2 --disk-format qcow2 --container-format bare --visibility public --name kloudbuster_v6


