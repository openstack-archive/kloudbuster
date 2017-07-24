# docker file for creating a container that has kloudbuster installed and ready to use
# this will build from uptreams master latest

FROM ubuntu:16.04
MAINTAINER kloudbuster-core <kloudbuster-core@lists.launchpad.net>

# Simpler would be to clone direct from upstream (latest)
# but the content might differ from the curent repo
# So we'd rather copy the current kloudbuster directory
# along with the pre-built qcow2 image
COPY ./ /kloudbuster/


# Install KloudBuster script and dependencies
# Note the dot_git directory must be renamed to .git
# in order for pip install -e . to work properly
RUN apt-get update && apt-get install -y \
       git \
       libyaml-dev \
       python \
       python-dev \
       python-pip \
    && pip install -U -q pip \
    && pip install -U -q setuptools \
    && cd /kloudbuster \
    && pip install -q -e . \
    && rm -rf .git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/*
