#!/usr/bin/env node

var dailygit = require('../');

dailygit.init()
        .then(dailygit.print.daily)
        .then(dailygit.print.limit);
