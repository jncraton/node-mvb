mvb - Minimum viable blogging engine on node.js
===============================================

[![Build Status](https://travis-ci.org/jncraton/node-mvb.svg?branch=master)](https://travis-ci.org/jncraton/node-mvb)

This application provides a simple way to host a markdown powered blog on node.js. All pages and resources are stored in a simple tree structure matching the following pattern:

* Indiviual pages: pages/[parent]/[id]-[slug]/content.md
* Page resources: pages/[parent]/[id]-[slug]/resource

Example pages are provided demonstating the available functionality.

This requires express and node-markdown packages to be available.