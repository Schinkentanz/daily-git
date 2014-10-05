[![NPM version](https://badge.fury.io/js/daily-git.svg)](http://badge.fury.io/js/daily-git)
[![Dependency Status](https://david-dm.org/schinkentanz/daily-git.svg)](https://david-dm.org/schinkentanz/daily-git)

# Daily Git(hub)
Get all of your commits on github (default: since last work day (0 am).

## Create new github token
https://github.com/settings/tokens/new (use default settings)

## Save github credentials using npm config

```bash
npm config set daily-git:token <TOKEN>
npm config set daily-git:username <USERNAME>
```

## Installation & How to use
```bash
npm install -g daily-git

# default is 1 day
daily-git

# want to have last 10 days?
daily-git --days 10
```

## Use it as a dependency
You can use daily-git as a dependency.

### Installation
```bash
npm install daily-git --save
```

### Examples
Print your daily and the request limit.
```js
var dailygit = require('daily-git');

// init function must be called first
dailygit.init()
        .then(dailygit.print.daily)
        .then(dailygit.print.limit);
```

Do the same manually.
```js
var dailygit = require('daily-git');

dailygit.init()
        .then(dailygit.getReposBranchesAndCommits)
        .each(function(result) {

          // result.repoData = { name: '', owner: '', repo: octonodeRepo }
          // result.branches
          // result.branches[i].commits

          result.branches.forEach(function(branch) {
            if (branch.commits.length) {
              dailygit.print.repoData(result.repoData, branch);
              branch.commits.forEach(dailygit.print.commit);
            }
          });
        });
```

### Available functions
```js
var dailygit = require('daily-git');

dailygit.init(10);                          // must be called first, set days to 10

dailygit.print.info('info to print');       // prints given string as an info to console
dailygit.print.error('error to print');     // prints given string as an error to console
dailygit.print.commit(commit);              // prints given commit to console

// every of the following functions returns a bluebird Promise https://github.com/petkaantonov/bluebird/blob/master/API.md

dailygit.print.limit();                     // prints remaining requests count
dailygit.print.daily();                     // prints your daily git(hub)

dailygit.limit();                           // promise result: an object: { left: 5000, max: 5000 }
dailygit.getRepos();                        // promise result: an array of octnode repos, e.g. client.repo('pksunkara/octonode')
dailygit.getOrganizationRepos();            // promise result: an array of octonode repos, e.g. client.repo('pksunkara/octonode')
dailygit.getBranches(repo);                 // promise result: an array of branch objects: https://developer.github.com/v3/repos/#list-branches
dailygit.getRepoCommits(repoData, branch);  // promise result: an array of commit objects: https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
dailygit.getReposBranchesAndCommits();      // promise result: [{repoData: { name: '', owner: '', repo: octonodeRepo }, branches: [{ name: '', commits: [...] }] ...} ...]
```

