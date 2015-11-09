============
Installation
============

There are two ways to install and run KloudBuster tool. Users of KloudBuster should use regular PyPI based installation, while developers of KloudBuster should use GitHub/OpenStack Repository based installation. Normally, PyPI based installation will satisfy most of use cases, and it is the recommended way for running KloudBuster under production environments, or through an automated or scheduled job. A git repository based installation gives more flexibility, and it is a must for developers of KloudBuster.

.. note:: Installation from PyPI will only have the latest stable version.

PyPI based Installation
-----------------------

This is the recommended way to install KloudBuster for non-development use, and KloudBuster is available in the Python Package Index (PyPI): `KloudBuster PyPI <https://pypi.python.org/pypi/KloudBuster>`_

Step 1
^^^^^^

You will need to have python 2.7, pip, and some dependencies installed before installing KloudBuster, run the command based on your distro.

Ubuntu/Debian based:

.. code-block:: bash

    $ sudo apt-get install python-dev python-pip python-virtualenv

RHEL/Fedora/CentOS based:

.. code-block:: bash

    $ sudo yum install gcc python-devel python-pip python-virtualenv

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

Alternatively, if you have `virtualenvwrapper <https://virtualenvwrapper.readthedocs.org>`_ installed:

.. code-block:: bash

    $ mkvirtualenv kloudbuster
    $ pip install kloudbuster

.. note::
    "A Virtual Environment is a tool to keep the dependencies required by different projects in separate places, by creating virtual Python environments for them." It is optional but recommended. We could use::

    $ sudo pip install kloudbuster

    instead if isolation among multiple Python projects is not needed.


To verify kloudbuster is installed, just type::

    kloudbuster --help

.. _git_installation:

GitHub/OpenStack Repository based Installation
----------------------------------------------

It is recommended to run KloudBuster inside a virtual environment. However, it can be skipped if installed in a dedicated VM.


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

KloudBuster can run natively on MacOSX. These instructions have been verified to work on MacOSX 10.10 (Yosemite).

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


Upload VM Image
---------------

.. note::

    If your OpenStack Glance can access the Internet, you can skip this section and you are done with the installation.

KloudBuster needs one "universal" test VM image (referred to as "KloudBuster image") that contains the necessary test software. The KloudBuster image is then instantiated in potentially large number of VMs by the KloudBuster application using the appropriate role (HTTP server, HTTP traffic generator...).

Pre-built images are available for download from the `OpenStack App Catalog <http://apps.openstack.org>`_ (preferred method). For whatever reason the pre-built version doesn't work for you, the image can be re-built from MacOSX using Vagrant or from any Linux server. See :ref:`here <build_vm_image>` for more details.


Manual upload of the KloudBuster VM image
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If Glance does not have access to http://storage.apps.openstack.org on the Internet, the KloudBuster VM image must be downloaded from the OpenStack App Catalog to an intermediate location then uploaded to Glance using either a Glance CLI command or via Horizon dashboard.

The KloudBuster VM image can be downloaded from `<http://apps.openstack.org/#tab=glance-images>`_. Look for an image named with the "kloudbuster_v" prefix and download the one that has the latest version.

KloudBuster VM images are qcow2 images named "kloudbuster_v<version>.qcow2" (e.g. "kloudbuster_v3.qcow2"). The name of the image in Glance must match exactly the image name in the App Catalog (without the .qcow2 extension), for example to upload the image from a local copy of that image:

.. code-block:: bash

    $ glance image-create --file kloudbuster_v3.qcow2 --disk-format qcow2 --container-format bare --is-public True --name kloudbuster_v3
