#!/usr/bin/env python
# Copyright 2016 Cisco Systems, Inc.  All rights reserved.
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.
#

###############################################################################
#                                                                             #
# This is a helper script which will delete all resources created by          #
# KloudBuster.                                                                #
#                                                                             #
# Normally, KloudBuster will clean up automatically when it is done. However, #
# sometimes errors or timeouts happen during the resource creation stage,     #
# which will cause KloudBuster out of sync with the real environment. If that #
# happens, a force cleanup may be needed.                                     #
#                                                                             #
# It is safe to use the script with the resource list generated by            #
# KloudBuster, usage:                                                         #
#     $ python force_cleanup.py --file kb_20150807_183001_svr.log             #
#                                                                             #
# Note: If running under single-tenant or tenant/user reusing mode, you have  #
#       to cleanup the server resources first, then client resources.         #
#                                                                             #
# When there is no resource list provided, the script will simply grep the    #
# resource name with "KB" and delete them. If running on a production         #
# network, please double and triple check all resources names are *NOT*       #
# starting with "KB", otherwise they will be deleted by the script.           #
#                                                                             #
###############################################################################

# ======================================================
#                        WARNING
# ======================================================
# IMPORTANT FOR RUNNING KLOUDBUSTER ON PRODUCTION CLOUDS
#
# DOUBLE CHECK THE NAMES OF ALL RESOURCES THAT DO NOT
# BELONG TO KLOUDBUSTER ARE *NOT* STARTING WITH "KB".
# ======================================================

from abc import ABCMeta
from abc import abstractmethod
import argparse
import re
import sys
import time

# openstack python clients
import cinderclient
import keystoneauth1
from keystoneclient.v2_0 import client as keystoneclient
import neutronclient
from novaclient.client import Client as novaclient
from novaclient.exceptions import NotFound
from tabulate import tabulate

# kloudbuster base code
import credentials

resource_name_re = None

def prompt_to_run():
    print "Warning: You didn't specify a resource list file as the input. "\
          "The script will delete all resources shown above."
    answer = raw_input("Are you sure? (y/n) ")
    if answer.lower() != 'y':
        sys.exit(0)

def fetch_resources(fetcher, options=None):
    if options:
        res_list = fetcher(search_opts=options)
    else:
        res_list = fetcher()
    resources = {}
    for res in res_list:
        # some objects provide direct access some
        # require access by key
        try:
            resid = res.id
            resname = res.name
        except AttributeError:
            resid = res['id']
            resname = res['name']
        if resource_name_re.match(resname):
            resources[resid] = resname
    return resources

class AbstractCleaner(object):
    __metaclass__ = ABCMeta

    def __init__(self, res_category, res_desc, resources, dryrun):
        self.dryrun = dryrun
        self.category = res_category
        self.resources = {}
        if not resources:
            print 'Discovering %s resources...' % (res_category)
        for rtype, fetch_args in res_desc.iteritems():
            if resources:
                if rtype in resources:
                    self.resources[rtype] = resources[rtype]
            else:
                self.resources[rtype] = fetch_resources(*fetch_args)

    def report_deletion(self, rtype, name):
        if self.dryrun:
            print '    + ' + rtype + ' ' + name + ' should be deleted (but is not deleted: dry run)'
        else:
            print '    + ' + rtype + ' ' + name + ' is successfully deleted'

    def report_not_found(self, rtype, name):
        print '    ? ' + rtype + ' ' + name + ' not found (already deleted?)'

    def report_error(self, rtype, name, reason):
        print '    - ' + rtype + ' ' + name + ' ERROR:' + reason

    def get_resource_list(self):
        result = []
        for rtype, rdict in self.resources.iteritems():
            for resid, resname in rdict.iteritems():
                result.append([rtype, resname, resid])
        return result

    @abstractmethod
    def clean(self):
        pass

class StorageCleaner(AbstractCleaner):
    def __init__(self, creds, resources, dryrun):
        from cinderclient import client
        crd = creds.get_credentials()
        self.cinder = client.Client('2', crd['username'], crd['password'],
                                    crd['tenant_name'], crd['auth_url'])

        res_desc = {'volumes': [self.cinder.volumes.list, {"all_tenants": 1}]}
        super(StorageCleaner, self).__init__('Storage', res_desc, resources, dryrun)

    def clean(self):
        print '*** STORAGE cleanup'
        try:
            kb_volumes = []
            kb_detaching_volumes = []
            for id, name in self.resources['volumes'].iteritems():
                try:
                    vol = self.cinder.volumes.get(id)
                    if vol.attachments:
                        # detach the volume
                        if not self.dryrun:
                            vol.detach()
                            print '    . VOLUME ' + vol.name + ' detaching...'
                        else:
                            print '    . VOLUME ' + vol.name + ' to be detached...'
                        kb_detaching_volumes.append(vol)
                    else:
                        # no attachments
                        kb_volumes.append(vol)
                except cinderclient.exceptions.NotFound:
                    self.report_not_found('VOLUME', name)

            # check that the volumes are no longer attached
            if kb_detaching_volumes:
                if not self.dryrun:
                    print '    . Waiting for %d volumes to be fully detached...' % \
                        (len(kb_detaching_volumes))
                retry_count = 2
                while True:
                    retry_count -= 1
                    for vol in list(kb_detaching_volumes):
                        if not self.dryrun:
                            latest_vol = self.cinder.volumes.get(kb_detaching_volumes[0].id)
                        if self.dryrun or not latest_vol.attachments:
                            if not self.dryrun:
                                print '    + VOLUME ' + vol.name + ' detach complete'
                            kb_detaching_volumes.remove(vol)
                            kb_volumes.append(vol)
                    if kb_detaching_volumes and not self.dryrun:
                        if retry_count:
                            print '    . VOLUME %d left to be detached, retries left=%d...' % \
                                (len(kb_detaching_volumes), retry_count)
                            time.sleep(2)
                        else:
                            print '    - VOLUME detach timeout, %d volumes left:' % \
                                (len(kb_detaching_volumes))
                            for vol in kb_detaching_volumes:
                                print '         ', vol.name, vol.status, vol.id, vol.attachments
                            break
                    else:
                        break

            # finally delete the volumes
            for vol in kb_volumes:
                if not self.dryrun:
                    vol.force_delete()
                self.report_deletion('VOLUME', vol.name)
        except KeyError:
            pass

class ComputeCleaner(AbstractCleaner):
    def __init__(self, creds, resources, dryrun):
        creden_nova = creds.get_nova_credentials_v2()
        self.nova_client = novaclient(**creden_nova)
        res_desc = {
            'instances': [self.nova_client.servers.list, {"all_tenants": 1}],
            'flavors': [self.nova_client.flavors.list],
            'keypairs': [self.nova_client.keypairs.list]
        }
        super(ComputeCleaner, self).__init__('Compute', res_desc, resources, dryrun)

    def clean(self):
        print '*** COMPUTE cleanup'
        try:
            deleting_instances = self.resources['instances']
            for id, name in self.resources['instances'].iteritems():
                try:
                    if self.dryrun:
                        self.nova_client.servers.get(id)
                        self.report_deletion('INSTANCE', name)
                    else:
                        self.nova_client.servers.force_delete(id)
                except NotFound:
                    deleting_instances.remove(id)
                    self.report_not_found('INSTANCE', name)

            if not self.dryrun and len(deleting_instances):
                print '    . Waiting for %d instances to be fully deleted...' % \
                    (len(deleting_instances))
                retry_count = 5 + len(deleting_instances)
                while True:
                    retry_count -= 1
                    for ins_id in deleting_instances.keys():
                        try:
                            self.nova_client.servers.get(ins_id)
                        except NotFound:
                            self.report_deletion('INSTANCE', deleting_instances[ins_id])
                            deleting_instances.pop(ins_id)

                    if not len(deleting_instances):
                        break

                    if retry_count:
                        print '    . INSTANCE %d left to be deleted, retries left=%d...' % \
                            (len(deleting_instances), retry_count)
                        time.sleep(2)
                    else:
                        print '    - INSTANCE deletion timeout, %d instances left:' % \
                            (len(deleting_instances))
                        for ins_id in deleting_instances.keys():
                            try:
                                ins = self.nova_client.servers.get(ins_id)
                                print '         ', ins.name, ins.status, ins.id
                            except NotFound:
                                print '         ', deleting_instances[ins_id], '(just deleted)', ins_id
                        break
        except KeyError:
            pass

        try:
            for id, name in self.resources['flavors'].iteritems():
                try:
                    flavor = self.nova_client.flavors.find(name=name)
                    if not self.dryrun:
                        flavor.delete()
                    self.report_deletion('FLAVOR', name)
                except NotFound:
                    self.report_not_found('FLAVOR', name)
        except KeyError:
            pass

        try:
            for id, name in self.resources['keypairs'].iteritems():
                try:
                    if self.dryrun:
                        self.nova_client.keypairs.get(name)
                    else:
                        self.nova_client.keypairs.delete(name)
                    self.report_deletion('KEY PAIR', name)
                except NotFound:
                    self.report_not_found('KEY PAIR', name)
        except KeyError:
            pass

class NetworkCleaner(AbstractCleaner):

    def __init__(self, creds, resources, dryrun):
        from neutronclient.v2_0 import client as nclient
        creden = creds.get_credentials()
        self.neutron = nclient.Client(endpoint_type='publicURL', **creden)

        # because the response has an extra level of indirection
        # we need to extract it to present the list of network or router objects
        def networks_fetcher():
            return self.neutron.list_networks()['networks']

        def routers_fetcher():
            return self.neutron.list_routers()['routers']

        def secgroup_fetcher():
            return self.neutron.list_security_groups()['security_groups']

        res_desc = {
            'sec_groups': [secgroup_fetcher],
            'networks': [networks_fetcher],
            'routers': [routers_fetcher]
        }
        super(NetworkCleaner, self).__init__('Network', res_desc, resources, dryrun)

    def remove_router_interface(self, router_id, port):
        """
        Remove the network interface from router
        """
        body = {
            # 'port_id': port['id']
            'subnet_id': port['fixed_ips'][0]['subnet_id']
        }
        try:
            self.neutron.remove_interface_router(router_id, body)
            self.report_deletion('Router Interface', port['fixed_ips'][0]['ip_address'])
        except neutronclient.common.exceptions.NotFound:
            pass

    def clean(self):
        print '*** NETWORK cleanup'

        try:
            for id, name in self.resources['sec_groups'].iteritems():
                try:
                    if self.dryrun:
                        self.neutron.show_security_group(id)
                    else:
                        self.neutron.delete_security_group(id)
                    self.report_deletion('SECURITY GROUP', name)
                except NotFound:
                    self.report_not_found('SECURITY GROUP', name)
        except KeyError:
            pass

        try:
            for id, name in self.resources['floating_ips'].iteritems():
                try:
                    if self.dryrun:
                        self.neutron.show_floatingip(id)
                    else:
                        self.neutron.delete_floatingip(id)
                    self.report_deletion('FLOATING IP', name)
                except neutronclient.common.exceptions.NotFound:
                    self.report_not_found('FLOATING IP', name)
        except KeyError:
            pass

        try:
            for id, name in self.resources['routers'].iteritems():
                try:
                    if self.dryrun:
                        self.neutron.show_router(id)
                        self.report_deletion('Router Gateway', name)
                    else:
                        self.neutron.remove_gateway_router(id)
                        self.report_deletion('Router Gateway', name)
                        # need to delete each interface before deleting the router
                        port_list = self.neutron.list_ports(id)['ports']
                        for port in port_list:
                            self.remove_router_interface(id, port)
                        self.neutron.delete_router(id)
                    self.report_deletion('ROUTER', name)
                except neutronclient.common.exceptions.NotFound:
                    self.report_not_found('ROUTER', name)
                except neutronclient.common.exceptions.Conflict as exc:
                    self.report_error('ROUTER', name, str(exc))
        except KeyError:
            pass
        try:
            for id, name in self.resources['networks'].iteritems():
                try:
                    if self.dryrun:
                        self.neutron.show_network(id)
                    else:
                        self.neutron.delete_network(id)
                    self.report_deletion('NETWORK', name)
                except neutronclient.common.exceptions.NetworkNotFoundClient:
                    self.report_not_found('NETWORK', name)
                except neutronclient.common.exceptions.NetworkInUseClient as exc:
                    self.report_error('NETWORK', name, str(exc))
        except KeyError:
            pass

class KeystoneCleaner(AbstractCleaner):

    def __init__(self, creds, resources, dryrun):
        crd = creds.get_credentials()
        self.keystone = keystoneclient.Client(endpoint_type='publicURL', **crd)
        res_desc = {
            'users': [self.keystone.users.list],
            'tenants': [self.keystone.tenants.list]
        }
        super(KeystoneCleaner, self).__init__('Keystone', res_desc, resources, dryrun)

    def clean(self):
        print '*** KEYSTONE cleanup'
        try:
            for id, name in self.resources['users'].iteritems():
                try:
                    if self.dryrun:
                        self.keystone.users.get(id)
                    else:
                        self.keystone.users.delete(id)
                    self.report_deletion('USER', name)
                except keystoneauth1.exceptions.http.NotFound:
                    self.report_not_found('USER', name)
        except KeyError:
            pass

        try:
            for id, name in self.resources['tenants'].iteritems():
                try:
                    if self.dryrun:
                        self.keystone.tenants.get(id)
                    else:
                        self.keystone.tenants.delete(id)
                    self.report_deletion('TENANT', name)
                except keystoneauth1.exceptions.http.NotFound:
                    self.report_not_found('TENANT', name)
        except KeyError:
            pass

class KbCleaners(object):

    def __init__(self, cred, resources, dryrun):
        self.cleaners = []
        for cleaner_type in [StorageCleaner, ComputeCleaner, NetworkCleaner, KeystoneCleaner]:
            self.cleaners.append(cleaner_type(cred, resources, dryrun))

    def show_resources(self):
        table = [["Type", "Name", "UUID"]]
        for cleaner in self.cleaners:
            table.extend(cleaner.get_resource_list())
        count = len(table) - 1
        print
        if count:
            print 'SELECTED RESOURCES:'
            print tabulate(table, headers="firstrow", tablefmt="psql")
        else:
            print 'There are no resources to delete.'
        print
        return count

    def clean(self):
        for cleaner in self.cleaners:
            cleaner.clean()

# A dictionary of resources to cleanup
# First level keys are:
# flavors, keypairs, users, routers, floating_ips, instances, volumes, sec_groups, tenants, networks
# second level keys are the resource IDs
# values are the resource name  (e.g. 'KBc-T0-U-R0-N0-I5')
def get_resources_from_cleanup_log(logfile):
    '''Load triplets separated by '|' into a 2 level dictionary
    '''
    resources = {}
    with open(logfile) as ff:
        content = ff.readlines()
        for line in content:
            tokens = line.strip().split('|')
            restype = tokens[0]
            resname = tokens[1]
            resid = tokens[2]
            if not resid:
                # normally only the keypairs have no ID
                if restype != "keypairs":
                    print 'Error: resource type %s has no ID - ignored!!!' % (restype)
                else:
                    resid = '0'
            if restype not in resources:
                resources[restype] = {}
            tres = resources[restype]
            tres[resid] = resname
    return resources


def main():
    parser = argparse.ArgumentParser(description='KloudBuster Force Cleanup')

    parser.add_argument('-r', '--rc', dest='rc',
                        action='store', required=False,
                        help='openrc file',
                        metavar='<file>')
    parser.add_argument('-f', '--file', dest='file',
                        action='store', required=False,
                        help='get resources to delete from cleanup log file (default:discover from OpenStack)',
                        metavar='<file>')
    parser.add_argument('-d', '--dryrun', dest='dryrun',
                        action='store_true',
                        default=False,
                        help='check resources only - do not delete anything')
    parser.add_argument('--filter', dest='filter',
                        action='store', required=False,
                        help='resource name regular expression filter (default:"KB") - OpenStack discovery only',
                        metavar='<any-python-regex>')
    opts = parser.parse_args()

    cred = credentials.Credentials(openrc_file=opts.rc)

    if opts.file:
        resources = get_resources_from_cleanup_log(opts.file)
    else:
        # None means try to find the resources from openstack directly by name
        resources = None
    global resource_name_re
    if opts.filter:
        try:
            resource_name_re = re.compile(opts.filter)
        except Exception as exc:
            print 'Provided filter is not a valid python regular expression: ' + opts.filter
            print str(exc)
            sys.exit(1)
    else:
        resource_name_re = re.compile('KB')


    cleaners = KbCleaners(cred, resources, opts.dryrun)

    if opts.dryrun:
        print
        print('!!! DRY RUN - RESOURCES WILL BE CHECKED BUT WILL NOT BE DELETED !!!')
        print

    # Display resources to be deleted
    count = cleaners.show_resources()
    if not count:
        sys.exit(0)

    if not opts.file and not opts.dryrun:
        prompt_to_run()

    cleaners.clean()

if __name__ == '__main__':
    main()
