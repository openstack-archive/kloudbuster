=========================================
KloudBuster Pip Install Quick Start Guide
=========================================

KloudBuster is available in the Python Package Index (PyPI)
`KloudBuster PyPI <https://pypi.python.org/pypi/KloudBuster>`_
and can be installed on any system that has python 2.7.

1. Install pip and the python virtualenv (if not installed already)
-------------------------------------------------------------------

You will need to have python 2.7, pip, and some dependencies installed
before installing KloudBuster depending on the operating system at the installation site.
These pre-requisites can be skipped if the corresponding dependencies are already installed.

Ubuntu/Debian based:

.. code-block:: bash

    $ sudo apt-get install python-dev python-pip python-virtualenv libyaml-dev

RHEL/Fedora/CentOS based:

.. code-block:: bash

    $ sudo yum install gcc python-devel python-pip python-virtualenv libyaml-devel

MacOSX::

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


2. Install KloudBuster in a virtual environment
-----------------------------------------------

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


To verify kloudbuster is installed properly, just type::

    kloudbuster --help

3. Upload the KloudBuster VM image
----------------------------------

Follow the :ref:`steps <upload_kb_image>` to upload the KloudBuster VM image to
the OpenStack cloud under test.

4. Download the openrc file
---------------------------
Using the Horizon dashboard, download the openrc file (Project|Compute|API
Access then click on "Download OpenStack RC File"). It is best to use the
admin user to run KloudBuster as much as possible (otherwise there are
restrictions on what you can do).


5. Running the KloudBuster CLI
------------------------------

Run the default HTTP data plane scale test
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default HTTP scale test is described :ref:`here <default_http_scale>`.


.. code-block:: bash

    kloudbuster --rc admin-openrc.sh --passwd admin

Run the default storage scale test
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default storage scale test is described :ref:`here <default_storage_scale>`.

.. code-block:: bash

    kloudbuster --rc admin-openrc.sh --passwd admin --storage

Run KloudBuster with a custom configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To get a copy of the default KloudBuster configuration and store it to a file
called "kb.cfg":

.. code-block:: bash

    kloudbuster --show-config >kb.cfg
    less kb.cfg

You can then edit kb.cfg and modify it appropriately. To run KloudBuster with
the custom configuration:

.. code-block:: bash

    kloudbuster --rc admin-openrc.sh --passwd admin --config kb.cfg

6. Running KloudBuster as a WebUI/REST Server
---------------------------------------------

.. code-block:: bash

    kb_start_server&

You should see a message similar to the one below, which indicates the server
is up running::

    Starting server in PID 27873
    serving on 0.0.0.0:8080, view at http://127.0.0.1:8080

By default KloudbBuster will listen on port 8080.
The KloudBuster Web UI URL to use from any browser is::

    http://<host_ip>:8080

The KloudBuster REST base URL is the above URL with "/api" appended::

    http://<host_ip>:8080/api

:ref:`How to use the Web UI <webui_usage>`

:ref:`How to use the REST interface <rest_usage>`

