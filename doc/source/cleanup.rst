.. _cleanup:

OpenStack Resources Cleanup
===========================

KloudBuster may exit with resources lingering in the cloud under test when there
are uncaught exceptions or when the configuration file explicitly disables any
resource cleanup upon exit (this option can be useful for debugging for
example).

KloudBuster provides a time saving *force_cleanup* python script to cleanup
resources created by a previous KlousBuster run. This script can also be used to
cleanup OpenStack resources with a name matching a given regular expression.

Resources in a given selection set are deleted along with their dependencies in
the correct order. For example to delete a router you need to delete first all
the interfaces before you can delete the router. To delete a volume you need to
first detach the volume (if attached) before it can be deleted.  Furthermore,
some resource deletions require dependent resources to be actually deleted first
(which can tale more or less time) before they can succeed. A volume detach
command for example can take time and if you do not want long enough the volume
deletion will fail.

The script takes care of all these dependencies and timing considerations.

The current version of the script can delete the following resources with a name
that matches a given regular expression:

* Storage
    * volumes (detach and delete)

* Compute
    * instances
    * flavors
    * key pairs

* Network
    * security groups
    * floating IPs
    * routers (including all associated interfaces)
    * networks

* Keystone:
    * users
    * tenants

In some cases, because of timing reasons, you may have to run the force_cleanup
script a few times to get rid of all selected resources.

How to Select Resources to Delete
---------------------------------

Resource list (--file <pathname>)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

KloudBuster generates a cleanup log file when it exits without deleting all
resources. This file is a text file with 1 row per resource, where each row has
the following format>::

  <resource type>|<resource name>|<uuid>

Example of cleanup log file::

  flavors|kb.client|58dededb-4c04-444f-8779-d0487ff08035
  flavors|kb.proxy|2613f998-9a77-4f49-bd1b-7cd83c1038cf
  keypairs|KBc-T0-U-K|
  users|KBc-T0-U|c50be73385a84acdb5bdfa565d2b613c
  routers|KBc-T0-U-R0|15678e46-a437-42d1-96a7-a57e9b96edcd
  floating_ips|10.23.228.204|7a93a1ba-2356-4dbe-a387-006e90be4462
  instances|KB-PROXY|67cb2da6-b05e-40b5-bc8f-df061035b945
  instances|KBc-T0-U-R0-N0-I0|ab895ccb-1632-42ed-8fa2-d0dd08b15641
  instances|KBc-T0-U-R0-N0-I1|ea416057-3a16-4f1c-875d-f4e0bb5b55c8
  instances|KBc-T0-U-R0-N0-I3|a95a9ff9-5c9c-470b-b6a3-a729e0cd7857
  instances|KBc-T0-U-R0-N0-I2|aff78e4f-cf59-49c9-81b3-53c9c2417d78
  instances|KBc-T0-U-R0-N0-I15|bda2b43e-fc5f-448a-a7ca-f152f2c62bb3
  instances|KBc-T0-U-R0-N0-I16|02e93acc-89b8-4bcf-94af-ec2369aee6b5
  volumes|KBc-T0-U-R0-N0-V0|ebd5f46e-7cfd-4bd4-a140-196a8cd3df38
  volumes|KBc-T0-U-R0-N0-V1|df84e730-1a1c-4b01-bd44-315d7128959a
  volumes|KBc-T0-U-R0-N0-V17|5c1b1765-248d-4f08-8b3c-4f43aa9bcc0d
  volumes|KBc-T0-U-R0-N0-V18|1c681d85-de43-4407-be97-98cc6a8f5a73
  volumes|KBc-T0-U-R0-N0-V19|291edb4a-9a79-40ed-b193-7e3e9b08e1f6
  sec_groups|KBc-T0-U-R0-N0-SG0|1a97ee38-bc10-4ca1-b7cc-8da09991595b
  tenants|KBc-T0|59d98fa36536490a8746c517b3ed7383
  networks|KBc-T0-U-R0-N0|7047d34c-ad77-4453-8d69-5dd41b102159

If such file is provided to the cleanup script using the *--file* option, only
the resources described in the file will be deleted.

Discovery with Resource name filter (--filter <regex>)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If no cleanup log file is provided, resources are discovered from OpenStack and
selected using a regular expression on the resource name (--filter <regex>). You
can specify any valid python regular expression to select the resource by name.

If you do not specify a cleanup log file nor a filter, the script will discover
all resources with a name starting with "KB" which is the prefix for all
KloudBuster resources.

Some examples (refer to the python regex documentation for a detailed
description of regular expressions):

+--------------------+-----------------------------------------------------------------+
| Regular expression | (default) any OpenStack resource with a name starting with "KB  |
+====================+=================================================================+
| ext$               | any OpenStack resource with a name starting ending with "ext"   |
+--------------------+-----------------------------------------------------------------+
| .*net              | any resource with a name containing "net" in any position       |
+--------------------+-----------------------------------------------------------------+
| glance|neutron     | any resource with a name starting with "glance" or "neutron"    |
+--------------------+-----------------------------------------------------------------+

.. warning::

    You can of course also specify '.\*' to list all resources but you probably
    do not want to delete all of them!

Credentials (RC) file (--rc <pathname>)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Specify the openrc file (downloaded from the Horizon API Access page) to provide
the credentials to access OpenStack. Alternatively you can also source that file
from the shell before invoking the force_cleanup.py script.

Dry Run (--dryrun)
^^^^^^^^^^^^^^^^^^

The script also provides a dry run mode, meaning that you can just check what
the script would do without actually deleting anything.

Installation and Dependencies
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The script is available in the OpenStack KloudBuster repository under
kloudbuster/force_cleanup.py. If you need to run the script outside of the usual
KloudBuster installation, the script requires the usual OpenStack python client
libraries and credentials.py (from the kloudbuster module). 
Otherwise, pick one of the kloudbuster installation method to install the script
(the KloudBuster docker container looks to be the simplest).

Known Issues and Limitations
----------------------------

Volumes attached to instances that are no longer present cannot be deleted
thorugh Nova or Cinder APIs. Such volumes will show up as attached to "None"
and in the "in-use" or "available" state from the Horizon dashboard.  In this
case, the script will print a warning with the volume ID::

   WARNING: Volume 6080fdce-f894-4c41-9bc0-70120e8560a8 attached to an instance that no longer exists  (will require manual cleanup of the database)

Cleanup of such volumes will require first setting the attach_status of the
corresponding volume to "detached" in the Cinder database directly. You have
to SSH to the controller host, and login to the MySQL shell:

.. code-block:: bash

    [root@gg34-2 ~]# mysql cinder
    MariaDB [cinder]> UPDATE volumes SET attach_status='detached' WHERE id='18ed7f10-be49-4569-9e04-2fc4a654efee';

Then re-run the script (or manually delete the volume from Horizon).


Examples
--------

KloudBuster resources cleanup::

  $ python force_cleanup.py -r admin-openrc.sh
  Please enter your OpenStack Password:
  Discovering Storage resources...
  Discovering Compute resources...
  Discovering Network resources...
  Discovering Keystone resources...


  SELECTED RESOURCES:
  +------------+--------------------+--------------------------------------+
  | Type       | Name               | UUID                                 |
  |------------+--------------------+--------------------------------------|
  | volumes    | KBc-T0-U-R0-N0-V34 | 8a7746b1-5c31-4db8-b80e-58baeb21b2e9 |
  | volumes    | KBc-T0-U-R0-N0-V36 | b1f007e6-e46f-4b25-beca-8418f8680377 |
  | volumes    | KBc-T0-U-R0-N0-V4  | 5168c8fb-2124-4c00-9365-0767551a1861 |
  | volumes    | KBc-T0-U-R0-N0-V3  | d02dd62b-cd12-4e75-8356-cf41f3d3bc86 |
  | volumes    | KBc-T0-U-R0-N0-V7  | 32f50b20-3d8c-46f8-8e0e-1e642fe52a67 |
  | volumes    | KBc-T0-U-R0-N0-V5  | 4ee5710f-8cb6-454d-8661-ac5daa0dec35 |
  | volumes    | KBc-T0-U-R0-N0-V31 | 5eae2777-6680-4d63-907f-9b9280bdab36 |
  | volumes    | KBc-T0-U-R0-N0-V17 | cd44d985-468c-4d15-a26a-3205966f56bf |
  | volumes    | KBc-T0-U-R0-N0-V29 | 20cfd301-6f24-4727-a2e6-ec4c7979f24a |
  | volumes    | KBc-T0-U-R0-N0-V9  | ab7a09cd-4176-4119-89bb-44f22e42ac57 |
  | volumes    | KBc-T0-U-R0-N0-V1  | 467c6203-b30a-460d-9654-79e3798814ad |
  | volumes    | KBc-T0-U-R0-N0-V13 | 9b8c1697-a691-4ca8-b8aa-0ba5126f4330 |
  | volumes    | KBc-T0-U-R0-N0-V20 | 2fae40bd-b7f8-4ad0-8b49-28199cc20219 |
  | volumes    | KBc-T0-U-R0-N0-V33 | 29949338-9fb0-4a6f-8df5-65a97cfc5b5c |
  | volumes    | KBc-T0-U-R0-N0-V10 | 562a7f29-e0d4-479d-a916-deb7b062d826 |
  | volumes    | KBc-T0-U-R0-N0-V35 | 9643b353-ac1b-4088-940d-babdfed8239a |
  | volumes    | KBc-T0-U-R0-N0-V25 | 1d605aed-ad92-469a-a3ae-d8763793b764 |
  | volumes    | KBc-T0-U-R0-N0-V22 | 895ba475-debb-4b06-9372-dabebfd26b1c |
  | volumes    | KBc-T0-U-R0-N0-V6  | f0c3659a-b9ef-4b15-a015-35fc845a8509 |
  | volumes    | KBc-T0-U-R0-N0-V37 | df749f20-f2a9-4d8e-b1c5-667c3c64bf15 |
  | volumes    | KBc-T0-U-R0-N0-V32 | 5cca56d7-9543-470e-a964-1f6a314ee3a7 |
  | volumes    | KBc-T0-U-R0-N0-V0  | eb4e82d7-131e-417a-9bbb-0aedbd3c2263 |
  | volumes    | KBc-T0-U-R0-N0-V38 | 65737d70-c41d-4a3d-853e-ae4c9ecae44d |
  | volumes    | KBc-T0-U-R0-N0-V23 | 04c5bcdb-49b5-4006-9479-1f15b530cfcc |
  | volumes    | KBc-T0-U-R0-N0-V11 | 181c2dc4-56fd-4f42-ab5d-5e9f9b8a3be5 |
  | volumes    | KBc-T0-U-R0-N0-V18 | 6f78f429-6603-4dba-9fa0-cbc601c170a1 |
  | volumes    | KBc-T0-U-R0-N0-V39 | b9878b28-9a34-43b0-a5ea-46f7598b23f7 |
  | volumes    | KBc-T0-U-R0-N0-V19 | 1a2ef52a-a990-4cb8-974e-2e7bfde07e64 |
  | volumes    | KBc-T0-U-R0-N0-V12 | 78761313-89d0-47df-b8a6-6d6baac5a48d |
  | volumes    | KBc-T0-U-R0-N0-V8  | 712c06bb-75a1-4d3b-8e7e-1d1845e2636e |
  | volumes    | KBc-T0-U-R0-N0-V30 | baaffd6c-ed0c-41c8-9f81-a59e8cef8318 |
  | volumes    | KBc-T0-U-R0-N0-V21 | 4ef6e3fd-e102-45f2-b69f-cc28049667b4 |
  | volumes    | KBc-T0-U-R0-N0-V28 | 728edd5d-df01-4eae-8811-1e8e0c1357d6 |
  | volumes    | KBc-T0-U-R0-N0-V14 | 33fe1128-a4da-4d68-b3fe-e160856c2b46 |
  | volumes    | KBc-T0-U-R0-N0-V15 | 7fac9831-2ade-487f-9c79-126b5981df5a |
  | volumes    | KBc-T0-U-R0-N0-V26 | 801f95d4-1100-4bbd-9ec1-5fbe925b70d5 |
  | volumes    | KBc-T0-U-R0-N0-V27 | 61802296-9201-4d7a-aeda-62f2ad8b2de2 |
  | volumes    | KBc-T0-U-R0-N0-V24 | 9fab9127-a496-41ad-b8ab-7bdc83d0df7e |
  | volumes    | KBc-T0-U-R0-N0-V2  | ed95d6c3-497e-4e5f-99b1-8f9c5bd82a54 |
  | volumes    | KBc-T0-U-R0-N0-V16 | 7083ac1d-1383-4a6f-b95c-cc11c5fe4eda |
  | sec_groups | KBc-T0-U-R0-N0-SG0 | b324ce05-384a-40e5-95f9-4e7e9dccb9d8 |
  | routers    | KBc-T0-U-R0        | 143a6fc6-5558-41c9-90cf-a08c4d26d37e |
  | networks   | KBc-T0-U-R0-N0     | d300fe6d-260b-4a99-99bc-a6a187c0fbc3 |
  | tenants    | KBc-T0             | 5d344c4be893420d9d94c7434143b09d     |
  | users      | KBc-T0-U           | d26097b180c64e34b80bfa4e73418267     |
  +------------+--------------------+--------------------------------------+


  Warning: You didn't specify a resource list file as the input. The script will delete all resources shown above.
  Are you sure? (y/n) y
  *** STORAGE cleanup
      + VOLUME KBc-T0-U-R0-N0-V34 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V36 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V4 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V3 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V7 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V5 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V31 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V17 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V29 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V9 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V1 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V13 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V20 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V33 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V10 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V35 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V25 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V22 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V6 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V37 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V32 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V0 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V38 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V23 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V11 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V18 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V39 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V19 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V12 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V8 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V30 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V21 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V28 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V14 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V15 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V26 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V27 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V24 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V2 is successfully deleted
      + VOLUME KBc-T0-U-R0-N0-V16 is successfully deleted
  *** COMPUTE cleanup
  *** NETWORK cleanup
      + SECURITY GROUP KBc-T0-U-R0-N0-SG0 is successfully deleted
      + Router Gateway KBc-T0-U-R0 is successfully deleted
      + Router Interface 10.1.0.3 is successfully deleted
      + ROUTER KBc-T0-U-R0 is successfully deleted
      + NETWORK KBc-T0-U-R0-N0 is successfully deleted
  *** KEYSTONE cleanup
      + USER KBc-T0-U is successfully deleted
      + TENANT KBc-T0 is successfully deleted


Delete all resources with a name starting with "HA"::

  $ python force_cleanup.py -r admin-openrc.sh --filter 'HA'
  Discovering Storage resources...
  Discovering Compute resources...
  Discovering Network resources...
  Discovering Keystone resources...

  SELECTED RESOURCES:
  +----------+----------------------------------------------------+--------------------------------------+
  | Type     | Name                                               | UUID                                 |
  |----------+----------------------------------------------------+--------------------------------------|
  | networks | HA network tenant b4d72c4ec4254c789ee11700e3f6d7a4 | ed2912db-4a56-4673-828c-c825e9f8d7ac |
  | networks | HA network tenant 890190a4482448d197606d663702efc2 | 32ee3483-8aee-4a97-a2d2-62ac7e521c67 |
  | networks | HA network tenant 0550a6a1045a40a1aa9cf3b92731ef00 | 586cc6e2-eec8-4927-8100-993027b6c925 |
  | networks | HA network tenant 3c0a953100964440ac1bc8c1611ce96e | fa3ff23e-7a62-458d-911f-299f938685a0 |
  | networks | HA network tenant 74a1ec7f4155403cbb482ea6be857295 | 09cee2bc-a2b7-4680-a6f0-542881f0fcd2 |
  | networks | HA network tenant 45f2158c9fd2496ab68c51ef69d0cb80 | df6e0506-9ede-4df9-adc1-11f3046a94c6 |
  | networks | HA network tenant 19dec7d3b39c48ef85b9d5e2500361f5 | 227c1e27-b117-43d6-9f0e-e1bd11993c05 |
  | networks | HA network tenant 5d344c4be893420d9d94c7434143b09d | c3c2eebb-95b0-4a0c-b700-5591b4992ce1 |
  +----------+----------------------------------------------------+--------------------------------------+

  Warning: You didn't specify a resource list file as the input. The script will delete all resources shown above.
  Are you sure? (y/n) y
  *** STORAGE cleanup
  *** COMPUTE cleanup
  *** NETWORK cleanup
      + NETWORK HA network tenant b4d72c4ec4254c789ee11700e3f6d7a4 is successfully deleted
      + NETWORK HA network tenant 890190a4482448d197606d663702efc2 is successfully deleted
      + NETWORK HA network tenant 0550a6a1045a40a1aa9cf3b92731ef00 is successfully deleted
      + NETWORK HA network tenant 3c0a953100964440ac1bc8c1611ce96e is successfully deleted
      + NETWORK HA network tenant 74a1ec7f4155403cbb482ea6be857295 is successfully deleted
      + NETWORK HA network tenant 45f2158c9fd2496ab68c51ef69d0cb80 is successfully deleted
      + NETWORK HA network tenant 19dec7d3b39c48ef85b9d5e2500361f5 is successfully deleted
      + NETWORK HA network tenant 5d344c4be893420d9d94c7434143b09d is successfully deleted
  *** KEYSTONE cleanup


Dry run mode, regular expression, environment variable credentials, find all
resources with a name ending with "ext"::

  $ python force_cleanup.py --dryrun --filter '.*ext$'
  Discovering Storage resources...
  Discovering Compute resources...
  Discovering Network resources...
  Discovering Keystone resources...

  !!! DRY RUN - RESOURCES WILL BE CHECKED BUT WILL NOT BE DELETED !!!

  SELECTED RESOURCES:
  +----------+-------------+--------------------------------------+
  | Type     | Name        | UUID                                 |
  |----------+-------------+--------------------------------------|
  | networks | storm-b-ext | a9e91d24-bb21-4321-a0d5-3408d15b25b4 |
  +----------+-------------+--------------------------------------+


  *** STORAGE cleanup
  *** COMPUTE cleanup
  *** NETWORK cleanup
      + NETWORK storm-b-ext should be deleted (but is not deleted: dry run)
  *** KEYSTONE cleanup

