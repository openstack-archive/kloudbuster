# docker file for creating a container that has kloudbuster installed and ready to use
FROM ubuntu:14.04
MAINTAINER kloudbuster-core <kloudbuster-core@lists.launchpad.net>

# Install KloudBuster script and dependencies
RUN apt-get update && apt-get install -y \
       libyaml-dev \
       python \
       python-dev \
       python-pip \
       python-virtualenv \
    && rm -rf /var/lib/apt/lists/*

RUN pip install pytz 
RUN pip install kloudbuster
