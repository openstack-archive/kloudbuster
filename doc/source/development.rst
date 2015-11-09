===========
Development
===========

.. _build_vm_image:

Build KloudBuster Image
------------------------

The official pre-built image from OpenStack App Catalog should satisfy most of
use cases. This option is just for development purposes, and for whatever
reason the pre-built version does not work for you.


Build on MacOSX
^^^^^^^^^^^^^^^

You need to install first:

* `Virtualbox <https://www.virtualbox.org/wiki/Downloads>`_
* `Vagrant <https://www.vagrantup.com/downloads.html>`_

And build the image with below commands:

.. code-block:: bash

    $ # Clone the kloudbuster repository if you have not done so
    $ git clone https://github.com/openstack/kloudbuster.git
    $ # Go to the dib directory
    $ cd kloudbuster/kb_dib
    $ # Run vagrant and start building the image
    $ vagrant up

After a few minutes (depending on virtualbox overhead), the qcow2 image will
be built and available in the same directory. You can then upload it to
OpenStack using the glance CLI, destroy the vagrant VM ("vagrant destroy") and
dispose of the kloudbuster directory (if no longer needed).


Build on Linux
^^^^^^^^^^^^^^

A generally faster build method than with MacOSX/Vagrant. Your Linux server
must have python, git and qemu utilities installed. You can skip the package
installation if you've installed KloudBuster using the GitHub/OpenStack
repository based installation.

Ubuntu/Debian based:

.. code-block:: bash

    $ sudo apt-get install python-dev git qemu-utils
    $ # Source the virtual environment if you have one
    $ pip install PyYAML

Redhat/Fedora/CentOS based:

.. code-block:: bash

    $ sudo yum install python-devel git qemu-img
    $ # Source the virtual environment if you have one
    $ pip install PyYAML

Build the image with below commands:

.. code-block:: bash

    $ # Clone the kloudbuster repository if you have not done so
    $ git clone https://github.com/openstack/kloudbuster.git
    $ # Go to the dib directory
    $ cd kloudbuster/kb_dib
    $ # Run the build image script, which will install DIB and start the build
    $ ./build-image.sh

After a few minutes, the qcow2 image will be built and available in the same
directory. You can then upload it to OpenStack using the glance CLI.


Trouble-shooting
^^^^^^^^^^^^^^^^

If you get an error message saying that import yaml fails (seems to happen
only on Ubuntu)::

    dib-run-parts Thu Jul 2 09:27:50 PDT 2015 Running /tmp/image.ewtpa5DW/hooks/extra-data.d/99-squash-package-install

    "/tmp/image.ewtpa5DW/hooks/extra-data.d/../bin/package-installs-squash",
    line 26, in <module>
         import yaml
    ImportError: No module named yaml

You need to comment out the secure_path option in your /etc/sudoers file (use
"sudo visudo" to edit that file)::

    #Defaults   secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"


.. include:: ../../kb_web/README.rst
