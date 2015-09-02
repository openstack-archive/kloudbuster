============
Contributing
============

Contribute to KloudBuster
-------------------------

Below are a simplified version of the workflow to work on KloudBuster. For complete instructions, you have to follow the Developer's Guide in OpenStack official documents. Refer to :ref:`below section <developer_guide_of_openstack>` for links.


Start working
^^^^^^^^^^^^^

Before starting, a GitHub/OpenStack respository based installation must be done. Refer :ref:`here <git_installation>` for detailed documentation.

1. From the root of your workspace, check out a new branch to work on::

    $ git checkout -b <TOPIC-BRANCH>

2. Happy working on your code for features or bugfixes;


Before Commit
^^^^^^^^^^^^^

There are some criteria that are enforced to commit to KloudBuster. Below commands will perform the check and make sure your code complys with it.

3. PEP 8::

    $ tox -epep8

.. note:: The first run usually takes longer, as tox will create a new virtual environment and download all dependencies. Once that is the done, further run will be very fast.

4. Run the test suite::

    $ tox -epython27

5. If you made a documentation change (i.e. changes to .rst files), make sure the documentation is built as you expected::

    $ cd <kloudbuster-ws-root>/doc
    $ make html

Once finished, the documentation in HTML format will be ready at <kloudbuster-ws-root>/doc/build/html.


Submit Review
^^^^^^^^^^^^^

6. Commit the code::

    $ git commit -a

.. note:: For a feature commit, please supply a clear commit message indicating what the feature is; for a bugfix commit, please also containing a launchpad link to the bug you are working on.

7. Submit the review::

    $ git review <TOPIC-BRANCH>

The members in the KloudBuster team will get notified once the Jenkin verification is passed. So watch your email from the review site, as it will contain the updates for your submission.

8. If the code is approved with a +2 review, Gerrit will automatically merge your code.


File Bugs
---------

Bugs should be filed on Launchpad, not GitHub:

   https://bugs.launchpad.net/kloudbuster


.. _developer_guide_of_openstack:

Developer's Guide of OpenStack
------------------------------

Feedbacks and contributions to KloudBuster are welcome.

KloudBuster follows the same workflow as any other OpenStack project.

If you would like to contribute to the development of OpenStack, you must
follow the steps in this page:

   `<http://docs.openstack.org/infra/manual/developers.html>`_

If you already have a good understanding of how the system works and your
OpenStack accounts are set up, you can skip to the development workflow
section of this documentation to learn how changes to OpenStack should be
submitted for review via the Gerrit tool:

   `<http://docs.openstack.org/infra/manual/developers.html#development-workflow>`_

Pull requests submitted through GitHub will be ignored.
