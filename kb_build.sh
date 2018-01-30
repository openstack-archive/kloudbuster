#!/bin/bash

# This script will build the kloudbuster VM image and the container image under the ./build directory

# Check we are in a virtual environment
function check_in_venv {
  IN_VENV=$(python -c 'import sys; print hasattr(sys, "real_prefix")')
  echo $IN_VENV
}

function cleanup_qcow2 {
  echo
  echo "Error: found unrelated qcow2 files that would make the container image too large."
  echo "Cleanup qcow2 files before re-running:"
  ls -l *.qcow2
  exit 3
}

# build the VM image first
function build_vm {
  kb_image_name=kloudbuster-$KB_TAG
  qcow_count=$(find . -name '*qcow2' | wc -l)
  if [ ! -f $kb_image_name.qcow2 ]; then
    if [ $qcow_count -gt 0 ]; then
      cleanup_qcow2
    fi
    echo "Building $kb_image_name.qcow2..."

    pip install diskimage-builder

    cd ./kb_dib
    # Add the kloudbuster elements directory to the DIB elements path
    export ELEMENTS_PATH=./elements

    # Install Ubuntu 16.04
    export DIB_RELEASE=xenial

    time disk-image-create -o $kb_image_name ubuntu kloudbuster
    rm -rf venv $kb_image_name.d
    mv $kb_image_name.qcow2 ..
    cd ..
  else
    if [ $qcow_count -gt 1 ]; then
      cleanup_qcow2
    fi
    echo "Reusing $kb_image_name.qcow2"
  fi

  ls -l $kb_image_name.qcow2
}

# Build container
function build_container {
  echo "docker build --tag=berrypatch/kloudbuster:$KB_TAG ."
  sudo docker build --tag=berrypatch/kloudbuster:$KB_TAG .
  echo "sudo docker build --tag=berrypatch/kloudbuster:latest ."
  sudo docker build --tag=berrypatch/kloudbuster:latest .
}

function help {
   echo
   echo "Usage: bash build.sh <options>"
   echo "   --vm-only to only build the KloudBuster VM qcow2 image"
   echo
   echo "Builds the KloudBuster VM and Docker container images"
   echo "The Docker container image will include the VM image for easier upload"
   echo
   echo "Must run in a virtual environment and must be called from the root of the repository"
   exit 1
}

build_vm_only=0
while [[ $# -gt 0 ]]; do
    key="$1"
    case "$key" in
        --vm-only)
        build_vm_only=1
        ;;
        -h|--help|*)
        help
        ;;
    esac
    # Shift after checking all the cases to get the next option
    shift
done
in_venv=$(check_in_venv)
if [ $in_venv != "True" ]; then
  echo "Error: Must be in a virtual environment to run!"
  exit 2
fi
# check we're at the root of the kloudbuster repo
if [ ! -d kloudbuster -o ! -f Dockerfile ]; then
  echo "Error: Must be called from the root of the kloudbuster repository to run!"
  exit 2
fi
# Install kloudbuster in the virtual env
pip install -q -U setuptools
pip install -q -e .
# Get the kloudbuster version (must be retrieved from stderr)
KB_TAG=$(kloudbuster --version 2>&1)
if [ $? != 0 ]; then
   echo "Error retrieving kloudbuster version:"
   echo
   kloudbuster --version
   exit 2
fi

echo
echo "Building KloudBuster with tag $KB_TAG"

build_vm
if [ $build_vm_only = 0 ]; then
  build_container
fi
