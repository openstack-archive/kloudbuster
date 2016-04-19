KloudBuster Web UI
------------------

KloudBuster integrates a Python based web server which is able to host both
RestAPI server and KloudBuster front-end website. Normally, KloudBuster has
the front-end website pre-built and integrated into the KloudBuster image,
so you don’t need to do anything to access the web UI.

Steps below are documented for development purposes, in the case if you want
to enhance the web UI. For regular users, the pre-built KloudBuster image
will satisfy most of the needs.


Build & Development
^^^^^^^^^^^^^^^^^^^

The web UI is based on AngularJS, developped from Mac OS X (Yosemite), and
verified on Ubuntu 14.04. The web UI is located in kloudbuster/kb_server/public
and accessible at: http://127.0.0.1:8080/ui/index.html.
