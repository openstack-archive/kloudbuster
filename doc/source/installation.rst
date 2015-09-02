============
Installation
============

Binary Installation
-------------------

This is the recommended way to install KloudBuster for non-development use.
KloudBuster is available in the Python Package Index (PyPI)::

	`KloudBuster PyPI <https://pypi.python.org/pypi/KloudBuster>`_

You will need to have python 2.7 and pip installed before installing KloudBuster.

At the command line::

    $ pip install kloudbuster

Or, if you have `virtualenv <https://pypi.python.org/pypi/virtualenv>`_ installed::

    $ virtualenv vkb
    $ source vkb/bin/activate
    $ pip install kloudbuster

Or, if you have `virtualenvwrapper <https://virtualenvwrapper.readthedocs.org>`_ installed::

    $ mkvirtualenv kloudbuster
    $ pip install kloudbuster


To verify kloudbuster is installed, just type

.. code::

	kloudbuster --help


Source Installation
-------------------
For code development, clone the kloudbuster git repository::

	git clone https://github.com/openstack/kloudbuster.git

Then install dependencies (after optionally creating and activating a virtual env)::

	cd kloudbuster
	pip install -r requirements.txt
	pip install -r test-requirements.txt

To verify kloudbuster is installed, just type

.. code::

	python kloudbuster/kloudbuster.py --help


VM Image Upload
---------------

KloudBuster needs one "universal" test VM image (referred to as "KloudBuster image") that contains the necessary test software. The KloudBuster image is then instantiated in potentially large number of VMs by the KloudBuster application using the appropriate role (HTTP server, HTTP traffic generator...).

Pre-built images are available for download from the `OpenStack App Catalog <http://apps.openstack.org>`_ (preferred method) or can be built from MacOSX using Vagrant or from any Linux server.

If your OpenStack Glance can access the Internet, you can skip the following section and **you are done with the installation**.


Manual Upload of the KloudBuster VM image
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If Glance does not have access to http://storage.apps.openstack.org on the Internet, the KloudBuster VM image must be downloaded from the OpenStack App Catalog to an intermediate location then uploaded to Glance using either a Glance CLI command or using the Horizon dashboard.
The KloudBuster VM image can be downloaded from `<http://apps.openstack.org/#tab=glance-images>`_ and look for an image named with the "kloudbuster_v" prefix and download the one that has the latest version.

KloudBuster VM images are qcow2 images named "kloudbuster_v<version>.qcow2" (e.g. "kloudbuster_v3.qcow2").

The name of the image in Glance must match exactly the image name in the App Catalog (without the .qcow2 extension), for example to upload the image from a local copy of that image:

.. code::

	glance image-create --file kloudbuster_v3.qcow2 --disk-format qcow2 --container-format bare --name kloudbuster_v3


Rebuild the Image
^^^^^^^^^^^^^^^^^

Only if using the pre-built version does not work (for whatever reason).


MacOSX with Vagrant
~~~~~~~~~~~~~~~~~~~

You need to install first:

* `Virtualbox <https://cisco.jiveon.com/external-link.jspa?url=https://www.virtualbox.org/wiki/Downloads>`_
* `Vagrant <https://cisco.jiveon.com/external-link.jspa?url=https://www.vagrantup.com/downloads.html>`_

.. code::

	# clone the kloudbuster repository if you have not done so
	git clone https://github.com/openstack/kloudbuster.git 
	# go to the dib directory  
	cd kloudbuster/kloudbuster/dib  
	# run vagrant and start building the image  
	vagrant up  

After a few minutes (depending on virtualbox overhead), the qcow2 image will be built and available in the same directory. You can then upload it to OpenStack using the glance CLI, destroy the vagrant VM ("vagrant destroy") and dispose of the kloudbuster directory (if no longer needed).

Buid on Linux
~~~~~~~~~~~~~

A generally faster build method than with MacOSX/Vagrant.
Your Linux server must have python, git and qemu utilities installed.

Ubuntu/Debian::

	$ sudo apt-get install python-dev git qemu-utils    

Redhat/Fedora/CentOS::

 	sudo yum install python-devel git qemu-img    

Furthermore, the python PyYAML package must be installed (use "pip install PyYAML" in your virtual environment if you have one).

Then build the image:
 
.. code::

	# clone the kloudbuster repository  
	git clone https://github.com/openstack/kloudbuster.git 

	# go to the dib directory  
	cd kloudbuster/kloudbuster/dib

	# run the build image script, will install DIB and start the build  
	sh build-image.sh
 
After a few minutes, the qcow2 image will be built and available in the same directory. You can then upload it to OpenStack using the glance CLI),

If you get an error message saying that import yaml fails (seems to happen only on Ubuntu):

.. code::

	dib-run-parts Thu Jul 2 09:27:50 PDT 2015 Running /tmp/image.ewtpa5DW/hooks/extra-data.d/99-squash-package-install  
	  
	"/tmp/image.ewtpa5DW/hooks/extra-data.d/../bin/package-installs-squash",  
	line 26, in <module>  
	     import yaml  
	ImportError: No module named yaml  
 
You need to comment out the secure_path option in your /etc/sudoers file (use "sudo visudo" to edit that file):

.. code::

	#Defaults   secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"  

