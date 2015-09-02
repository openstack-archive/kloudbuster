#!/bin/bash

#
# A shell script to build the kloudbuster image using diskinage-builder
#
# The following packages must be installed prior to using this script:
# sudo apt-get -y install git
# sudo apt-get -y install qemu-utils

# install diskimage-builder
git clone git://github.com/openstack/diskimage-builder.git
git clone git://github.com/openstack/dib-utils.git

# Add diskimage-builder and dib-utils bin to the path
export PATH=$PATH:`pwd`/diskimage-builder/bin:`pwd`/dib-utils/bin

# Add the kloudbuster elements directory to the DIB elements path
export ELEMENTS_PATH=`pwd`/elements

# Extract image version number '__version__ = 2.0' becomes '__version__=2_0'
ver=`grep '^__version__' ../kloudbuster/kb_vm_agent.py | tr -d ' ' | tr '.' '_'`
eval $ver

kb_image_name=kloudbuster_v$__version__

echo "Building $kb_image_name.qcow2..."

time disk-image-create -o $kb_image_name ubuntu kloudbuster

ls -l $kb_image_name.qcow2

# cleanup
rm -rf diskimage-builder dib-utils

