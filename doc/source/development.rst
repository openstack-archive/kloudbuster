===========
Development
===========

.. _build_vm_image:

Building the KloudBuster VM and Docker images
---------------------------------------------

This section describes how to rebuild:

- the KloudButer VM Image from the git repository source code
- the KloudBuster Docker image

A Linux server with python, git and qemu utilities installed is required. 


Create a virtual environment (if not done already):

.. code-block:: bash

    virtualenv vkb
    source vkb/bin/activate

Ubuntu/Debian based:

.. code-block:: bash

    sudo apt-get install python-dev git qemu-utils
    pip install PyYAML

Redhat/Fedora/CentOS based:

.. code-block:: bash

    sudo yum install python-devel git qemu-img
    pip install PyYAML



Build the image with below commands:

.. code-block:: bash

    # Clone the kloudbuster repository if you have not done so
    git clone https://github.com/openstack/kloudbuster.git
    cd kloudbuster
    # Install kloudbuster
    pip install -e .
    # Run the build image script
    $ ./kb_build.sh

After a few minutes, the qcow2 and container images will be built and available in the same
directory. The qcow2 and container images will be named after the version (e.g. kloudbuster-7.0.0.qcow2 and berrypatch/kloudbuster:7.0.0).

Pushing the Docker container to DockerHub
-----------------------------------------

The KloudBuster Docker images are published in the DockerHub berrypatch repository:
`<https://hub.docker.com/r/berrypatch/kloudbuster/>`_

To publish you need to be a member of the berrypatch kloudbuster team. After the login (requires your DockerHub username and password), push the appropriate version to berrypatch:

.. code-block:: bash

    sudo docker login
    sudo docker push berrypatch/kloudbuster:7.0.0





