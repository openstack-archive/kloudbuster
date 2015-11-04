# KloudBuster Web UI

***

This is KloudBuster front-end website source code.

From the root of the KloudBuster repository, go to kb_web directory.

If you want to develop the UI code, run below command to setup the environment:

## Installing
***

Before editing the Web UI, you need to install npm, nodeJS, grunt, bower.

### NodeJS & npm

install NodeJS & npm:
see <https://nodejs.org/>

### Grunt

Installing the grunt CLI

`npm install -g grunt-cli`

Change to the project's root directory.

Install KloudBuster Web UI dependencies with `npm install`. (see package.json)

### Bower

`npm install -g bower`

`bower install`

(see bower.json)

## Build & development

***

Run `grunt` for building and `grunt serve` for preview.

When you run `grunt build`, all the CSS and JavaScript files are hanging around in the build directory (/dist). 

Copy `/dist` to `/kloudbuster/kb_server/public/ui/` and run the server.

Open your browser, and type the below address to start using it: 

`http://127.0.0.1:8080/ui/index.html`

