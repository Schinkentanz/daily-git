#!/usr/bin/env node

var dailygit = require('../src/');

dailygit.init()
        .then(dailygit.print.daily)
        .then(dailygit.print.limit);
