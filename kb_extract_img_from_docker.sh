#!/bin/bash

# Scriot to extract the same version kloudbuster VM image from docker hub
# and store it on the current directory
# Should be used when running kloudbuster using PyPI or git clone and 
# rebuilding the VM is not an option

# Requires kloudbuster to be installed (pip install -e .)
# Requires docker to be installed!

function usage {
    echo "
Usage: kb_extract_img_from_docker.sh [--version <version>]

   <version>    optional KloudBuster version to extract (e.g. 7.0.0)

Extracts a KloudBuster VM image from DockerHub and stores it on the local directory

If version is provided, the image for that version is retrieved

If version is not provided, the image for the current KloudBuster installation is
          retrieved (requires KloudBuster to be installed using 'pip install -e .')

This script should only be used when not running KloudBuster from Docker
(e.g. running it from pip or from a git clone) and when rebuilding the VM image
is not an option.
"
    exit 1
}

# Get the exact version
# Get the kloudbuster version (must be retrieved from stderr)
function get_kloudbuster_version {
    KB_VER=$(kloudbuster --version 2>&1)
    if [ $? != 0 ]; then
       echo "Error running kloudbuster, make sure it is installed with 'pip install -e .'"
       echo
       exit 2
    fi
}

function extract_vm_image {
    VM_IMG_NAME=kloudbuster-$KB_VER.qcow2
    if [ -f $VM_IMG_NAME ]; then
        echo "$VM_IMG_NAME is already available"
    else
        # Pull the right version container from docker hub
        IMG_NAME=berrypatch/kloudbuster:$KB_VER
        docker pull $IMG_NAME
        if [ $? != 0 ]; then
            echo "Error pulling $IMG_NAME, please check it is available"
            exit 1
        fi

        docker run --rm -v $PWD:/tmp/local $IMG_NAME cp /kloudbuster/$VM_IMG_NAME /tmp/local
        if [ $? != 0 ]; then
            echo "Error extracting $VM_IMG_NAME from the container"
            exit 3
        else
            echo "Successfully extracted $VM_IMG_NAME from the container"
        fi
    fi

    ls -l $VM_IMG_NAME
}

KB_VER=0
while [[ $# -gt 0 ]]; do
    key="$1"
    case "$key" in
        --version|-v)
        KB_VER=$2
        shift
        ;;
        -h|--help|*)
        usage
        ;;
    esac
    # Shift after checking all the cases to get the next option
    shift
done

if [ $KB_VER = 0 ]; then
    get_kloudbuster_version
fi
extract_vm_image
