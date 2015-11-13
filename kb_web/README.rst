KloudBuster Web UI
------------------

KloudBuster integrates a Python based web server which is able to host both
RestAPI server and KloudBuster front-end website. Normally, KloudBuster has
the front-end website pre-built and integrated into the KloudBuster image,
so you don’t need to do anything to access the web UI.

Steps below are documented for development purposes, in the case if you want
to enhance the web UI. For regular users, the pre-built KloudBuster image
will satisfy most of the needs.


Setup Development Environment
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The web UI is based on AngularJS, developped from Mac OS X (Yosemite), and
verified on Ubuntu 14.04. Simply to say, below packages need to be installed
in order to do developments: NodeJS, npm, grunt and bower.


NodeJS & npm
""""""""""""

Ubuntu/Debian based:

.. code-block:: bash

    $ sudo apt-get install npm nodejs nodejs-legacy

Some scripts expect a binary called node to be present whereas Ubuntu installs
it as nodejs. The "nodejs-legacy" package contains a symlink for legacy Node.js
code requiring binary to be /usr/bin/node (not /usr/bin/nodejs as provided in
Debian).

Mac OS X:

Download the packages from `nodejs.org <https://nodejs.org>`_, and install
like a regular app.


Grunt
"""""

Change to the project's root directory (/kb_web), install Grunt's command line
interface (CLI) globally, and install the project dependencies specified in
kb_web/package.json:

.. code-block:: bash

    $ sudo npm install -g grunt-cli
    $ sudo npm install

Bower
"""""

Install Bower, and install packages specified in bower.json:

.. code-block:: bash

    $ sudo npm install -g bower
    $ bower install --force


Build & Development
^^^^^^^^^^^^^^^^^^^

To preview the Web UI::

    $ grunt serve

To compress all files to kb_web/dist::

    $ grunt build

To integrate the Web UI into the KloudBuster server, copy all files from kb_web/dist
to ../kb_server/public/ui, run the KloudBuster server, and the website will be
accessible at: http://127.0.0.1:8080/ui/index.html.
