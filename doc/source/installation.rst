============
Installation
============

KloudBuster is already pre-installed as a web service in the KloudBuster VM image 
available from the `OpenStack Community App Catalog <https://apps.openstack.org>`_

There are two alternative ways to install and run KloudBuster tool.
Users of KloudBuster who prefers to use the CLI should use regular PyPI based installation.
Developers of KloudBuster should use the GitHub/OpenStack Repository based installation.

Web Service and PyPI based installation will satisfy most use cases
and are the 2 recommended ways for running KloudBuster under production environments, or through an
automated or scheduled job.
The git repository based installation is targeted at developers of KloudBuster.

.. note:: Installation from PyPI will only have the latest stable version.

PyPI based Installation
-----------------------

This is the recommended way to install KloudBuster for non-development use if CLI is required.
KloudBuster is available in the Python Package Index (PyPI):
`KloudBuster PyPI <https://pypi.python.org/pypi/KloudBuster>`_

Step 1
^^^^^^

You will need to have python 2.7, pip, and some dependencies installed
before installing KloudBuster, run the command based on your distro.

Ubuntu/Debian based:

.. code-block:: bash

    $ sudo apt-get install python-dev python-pip python-virtualenv libyaml-dev

RHEL/Fedora/CentOS based:

.. code-block:: bash

    $ sudo yum install gcc python-devel python-pip python-virtualenv libyaml-devel

MacOSX:

.. code-block:: bash

    $ # Download the XCode command line tools from Apple App Store
    $ xcode-select --install
    $ sudo easy_install pip
    $ sudo pip install virtualenv

Step 2
^^^^^^

Create a virtual environment for Python, and install KloudBuster:

.. code-block:: bash

    $ virtualenv vkb
    $ source vkb/bin/activate
    $ pip install kloudbuster

Alternatively, if you have
`virtualenvwrapper <https://virtualenvwrapper.readthedocs.org>`_ installed:

.. code-block:: bash

    $ mkvirtualenv kloudbuster
    $ pip install kloudbuster

.. note::
    "A Virtual Environment is a tool to keep the dependencies required by
    different projects in separate places, by creating virtual Python
    environments for them." It is optional but recommended. We could use::

    $ sudo pip install kloudbuster

    instead if isolation among multiple Python projects is not needed.


To verify kloudbuster is installed, just type::

    kloudbuster --help

.. _git_installation:

GitHub/OpenStack Repository based Installation
----------------------------------------------

It is recommended to run KloudBuster inside a virtual environment. However,
it can be skipped if installed in a dedicated VM.


Super quick installation on Ubuntu/Debian
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    $ sudo apt-get install python-dev python-virtualenv git git-review qemu-utils
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -r requirements-dev.txt

Super quick installation on RHEL/Fedora/CentOS
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    $ sudo yum install python-devel python-virtualenv git qemu-img
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -r requirements-dev.txt

Super quick installation on MacOSX
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

KloudBuster can run natively on MacOSX. These instructions have been verified
to work on MacOSX 10.10 (Yosemite).

First, download XCode from App Store, then execute below commands:

.. code-block:: bash

    $ # Download the XCode command line tools
    $ xcode-select --install
    $ # Install pip
    $ sudo easy_install pip
    $ # Install python virtualenv
    $ sudo pip install virtualenv
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -r requirements-dev.txt

Verify installation
^^^^^^^^^^^^^^^^^^^

To verify kloudbuster is installed, just type:

.. code-block:: bash

    $ python kloudbuster/kloudbuster.py --help

.. _upload_kb_image:

Upload KloudBuster Image
-------------------------

.. note::

    If your OpenStack Glance is able to access the Internet, and you don't
    need to access the KloudBuster Web UI from the pre-built image, you can skip
    this section and you are done with the installation.

In the cloud under test, KloudBuster needs one "universal" test VM image
(referred to as "KloudBuster image") that contains the necessary test software.
The KloudBuster image is
then instantiated in potentially large number of VMs by the KloudBuster
application using the appropriate role (HTTP server, HTTP traffic generator,
etc.).

Pre-built images are available for download from the
`OpenStack App Catalog <http://apps.openstack.org>`_ (preferred method). For
whatever reason the pre-built version doesn't work for you, the image can be
re-built from MacOSX using Vagrant or from any Linux server. See
:ref:`here <build_vm_image>` for more details.

.. note::

    The same KloudBuster VM image can be instantiated for running the test functions
    (HTTP servers and HTTP traffic generators) and for running KloudBuster as a web service.


Manual upload of the KloudBuster VM image
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In order to upload the KloudBuster Image to the cloud under test, the image
must be downloaded from the OpenStack App Catalog either directly from
the OpenStack App Catalog (if you have direct access to the Internet)
or through an intermediate location such as a jump host (a jump host has access 
to both Internet and the cloud under
test and can be used to download the image from the App Catalog
and upload to Glance using either a Glance CLI command or via Horizon
dashboard).

KloudBuster VM images are qcow2 images named "kloudbuster_v<version>.qcow2"
(e.g. "kloudbuster_v6.qcow2"). The image can be downloaded from
`<http://apps.openstack.org/#tab=glance-images>`_. Look for an image named
with the "kloudbuster_v" prefix and download the latest version from the list.

The name of the image in Glance must match exactly the image name in the App
Catalog (without the .qcow2 extension), for example to upload the image from
a local copy of that image:

.. code-block:: bash

    $ glance image-create --file kloudbuster_v6.qcow2 --disk-format qcow2 --container-format bare --is-public True --name kloudbuster_v6
