# KloudBuster Web UI

KloudBuster integrates a Python based web server to host the KloudBuster front-end website.

If you want to change the UI code, you need to install NodeJS, npm, grunt and bower.

## Installation

### NodeJS & npm

download nodejs & npm. For more detail see [nodejs.org](https://nodejs.org/)

#### NodeJS installation on Ubuntu/Debian

Some install scripts expect there a binary called node to be present whereby Ubuntu installs it as nodejs.

Using `sudo apt-get install nodejs-legacy`, 

the nodejs package shall be changed to provide /usr/bin/nodejs, not /usr/bin/node.

### Grunt

Install Grunt's command line interface (CLI) globally:

`sudo npm install -g grunt-cli`

And the project has already been configured with a kb_web/package.json and a Gruntfile.

Then change to the project's root directory (/kb_web).

Install project dependencies with `sudo npm install`.

### Bower

Install Bower:

`sudo npm install -g bower`

Then execute the `bower install` command to install all of the packages which specified in kb_web/bower.json.


## Build & development

Run `grunt serve` for preview UI.

Run `grunt build` to compress all files to kb_web/dist.

Then you need to copy all files from kb_web/dist to ../kb_server/public/ui and run the kloudbuster server.

Open your browser (The best compatible web browser is Chrome), and type the below address to start using it:

`http://127.0.0.1:8080/ui/index.html`
