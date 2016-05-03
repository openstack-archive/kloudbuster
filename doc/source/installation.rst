============
Installation
============

KloudBuster is already pre-installed as a web service in the KloudBuster VM image 
available from the `OpenStack Community App Catalog <https://apps.openstack.org>`_.
So if you just need to use the KloudBuster Web user interface you can instantiate
that VM image and point your browser to its public address as described in :ref:`run_server`.

There are two alternative ways to install and run KloudBuster tool.

Users of KloudBuster who prefers to use the CLI or who prefer to run KloudBuster
locally on their workstation or laptop should use the PyPI based installation
(pip install).

Developers of KloudBuster should use the GitHub/OpenStack Repository based installation
(git clone).

Web Service and PyPI based installation will satisfy most use cases
and are the 2 recommended ways for running KloudBuster under production environments, 
or through an automated or scheduled job.

.. note:: Installation from PyPI will only have the latest stable version.

PyPI based Installation
-----------------------

This is the recommended way to install KloudBuster for non-development use if CLI is preferred
or if you prefer to run KloudBuster locally.

KloudBuster is available in the Python Package Index (PyPI)
`KloudBuster PyPI <https://pypi.python.org/pypi/KloudBuster>`_
and can be installed on any system that has python 2.7.

Step 1: Install pip and the python virtualenv (if not installed already)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You will need to have python 2.7, pip, and some dependencies installed
before installing KloudBuster depending on the operating system at the installation site.
These pre-requisites can be skipped if the corresponding dependencies are already installed.

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
    $
    $ # If you need to run KloudBuster Web UI from PyPI installation,
    $ # coreutils needs to be installed using Homebrew.
    $ # Refer here for the steps to install Homebrew on Mac:
    $ # http://brew.sh/
    $ brew install coreutils

Step 2: Install KloudBuster in a virtual environment
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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


Quick installation on Ubuntu/Debian
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    $ sudo apt-get install python-dev python-virtualenv git git-review qemu-utils
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -r requirements-dev.txt

Quick installation on RHEL/Fedora/CentOS
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    $ sudo yum install python-devel python-virtualenv git qemu-img
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -r requirements-dev.txt

Quick installation on MacOSX
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

KloudBuster can run natively on MacOSX.

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

    If your OpenStack Glance is able to access the Internet and you only use
    the CLI to launch KloudBuster, you can skip this section (KloudBuster CLI
    will request Glance to download the image from the OpenStack App Catalog when
    it is not present in Glance).

In the cloud under test, KloudBuster needs one "universal" test VM image
(referred to as "KloudBuster image") that contains the necessary test software.
The KloudBuster image is
then instantiated in potentially large number of VMs by the KloudBuster
application using the appropriate role (HTTP server, HTTP traffic generator,
etc.).

Pre-built images are available for download from the
`OpenStack App Catalog <http://apps.openstack.org>`_ (preferred method). 

.. note::

    The same KloudBuster VM image can be instantiated for running the test functions
    (HTTP servers and HTTP traffic generators) and for running KloudBuster as a web service.


Manual upload of the KloudBuster VM image
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In order to upload the KloudBuster Image to the cloud under test, the image
must be downloaded from the OpenStack App Catalog either directly from
the OpenStack App Catalog (if you have direct access to the Internet)
or through an intermediate location such as a laptop that has Internet access
or a jump host (a jump host has access 
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
a local copy of that image using the Glance CLI:

.. code-block:: bash

    $ glance image-create --file kloudbuster_v6.qcow2 --disk-format qcow2 --container-format bare --is-public True --name kloudbuster_v6
