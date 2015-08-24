========
Usage
========

To run KloudBuster you need to:

* install KloudBuster (see instructions in the Installation section) 
* upload a KloudBuster test VM image to the OpenStack image store (Glance)


There are 3 ways to launch KloudBuster:

* run a scale session exclusively from the command line interface
* run as a background server controlled by the KloudBuster Web User Interface
* run as a background server controlled by an external tool or application using a RESTful interface

Build the KoudBuster test VM image
----------------------------------

KloudBuster only needs one "universal" test VM image (referred to as "KloudBuster image") that contains the necessary test software. The KloudBuster image is then launched in the cloud by the KloudBuster application using the appropriate role (HTTP server, HTTP traffic generator...).

Build on MacOSX with Vagrant
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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

After a few minutes, the qcow2 image will be built and available in the same directory. You can then copy it in a safe location (or perhaps upload it to OpenStack using glance CLI), destroy the vagrant VM ("vagrant destroy") and dispose of the kloudbuster directory (if no longer needed).

Build on Linux
^^^^^^^^^^^^^^
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
 
After a few minutes, the qcow2 image will be built and available in the same directory. You can then copy it in a safe location (or perhaps upload it to OpenStack using glance CLI),

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


Command Line Interface Options
------------------------------


Configuration File
------------------

KloudBuster Web User Interface
------------------------------


RESTful Interface
-----------------
