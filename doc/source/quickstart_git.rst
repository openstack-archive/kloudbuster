=================================
KloudBuster Git Quick Start Guide
=================================

.. _git_installation:

This is the default installation method for code development.

It is recommended to run KloudBuster inside a virtual environment.

1. Install Dependencies and Clone Git Repository
------------------------------------------------

Quick installation on Ubuntu/Debian
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    $ sudo apt-get install build-essential python-dev python-virtualenv git git-review qemu-utils
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -e .
    $ pip install -r requirements-dev.txt

Quick installation on RHEL/Fedora/CentOS
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    $ sudo yum install gcc python-devel python-virtualenv git qemu-img
    $ # create a virtual environment
    $ virtualenv ./vkb
    $ source ./vkb/bin/activate
    $ git clone https://github.com/openstack/kloudbuster.git
    $ cd kloudbuster
    $ pip install -e .
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
    $ pip install -e .
    $ pip install -r requirements-dev.txt

If you need to run the KloudBuster Web UI you need to install coreutils
(you can skip this step if you do not run the KloudBuster Web server)::


    $ # If you need to run KloudBuster Web UI,
    $ # coreutils needs to be installed using Homebrew.
    $ # Refer here for the steps to install Homebrew on Mac:
    $ # http://brew.sh/
    $ brew install coreutils

Verify installation
^^^^^^^^^^^^^^^^^^^

To verify kloudbuster is installed, from the root of the kloudbuster repository type:

.. code-block:: bash

    kloudbuster --version

2. Upload the KloudBuster VM image
----------------------------------

Follow the :ref:`steps <upload_kb_image>` to upload the KloudBuster VM image
to the OpenStack cloud under test.

3. Download the openrc file
---------------------------

Using the Horizon dashboard, download the openrc file (Project|Compute|API
Access then click on "Download OpenStack RC File"). It is best to use the
admin user to run KloudBuster as much as possible (otherwise there are
restrictions on what you can do). The examples below assume the openrc file is
saved at the root of the kloudbuster git repository with the name
"admin-openrc.sh" and the password is "admin".

4. Running the KloudBuster CLI
------------------------------

Run the default HTTP data plane scale test
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default HTTP scale test is described :ref:`here <default_http_scale>`.

.. code-block:: bash

    python kloudbuster/kloudbuster.py --rc admin-openrc.sh --passwd admin

Run the default storage scale test
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default storage scale test is described :ref:`here <default_storage_scale>`.

.. code-block:: bash

    kloudbuster --rc admin-openrc.sh --passwd admin --storage

Run KloudBuster with a custom configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default KloudBuster configuration file is in cfg.scale.yaml. You can make a
copy of it in "kb.cfg":

.. code-block:: bash

    cp kloudbuster/cfg.scale.yaml kb.cfg

You can then edit kb.cfg and modify it appropriately. To run KloudBuster with
the custom configuration:

.. code-block:: bash

    kloudbuster --rc admin-openrc.sh -passwd admin --config kb.cfg

5. Running KloudBuster as a WebUI/REST Server
---------------------------------------------

.. code-block:: bash

    kb_start_server&

You should see a message similar to the one below, which indicates the server
is up running::

    Starting server in PID 27873
    serving on 0.0.0.0:8080, view at http://127.0.0.1:8080

By default KloudbBuster will listen on port 8080.

:ref:`How to use the Web UI <webui_usage>`

:ref:`How to use the REST interface <rest_usage>`

To terminate the server, simply use the kill command on the server pid.


