var npm = require('npm'),
    clc = require('cli-color'),
    Promise = require('bluebird'),
    moment = require('moment'),
    github = Promise.promisifyAll(require('octonode')),
    argv = require('minimist')(process.argv.slice(2)),
    client = null, ghme = null,
    ct = clc.cyanBright,
    bt = clc.blackBright,
    rt = clc.redBright,
    settings = {
      days: argv.days || 1
    };

function init () {
  return new Promise(function(resolve, reject) {
    npm.load({}, function() {
      settings.token = npm.config.get('daily-git:token');
      settings.username = npm.config.get('daily-git:username');

      if (!settings.token) {
        printError('Token is missing (https://github.com/settings/tokens/new)! Set it via:\n\tnpm config set daily-git:token <TOKEN>');
        return;
      }

      if (!settings.username) {
        printError('Username is missing! Set it via:\n\tnpm config set daily-git:username <USERNAME>');
        return;
      }

      client = github.client(settings.token);

      ghme = client.me();

      resolve();
    });
  });
}

function mapOrganizations (orgs) {
  return orgs.map(function (org) {
    return client.org(org.login);
  });
}

function mapRepositories (repos) {
  return repos.map(function(repo) {
    return client.repo(repo.full_name)
  });
}

function getRepoData (repo) {
  var split = repo.name.split('/'),
      owner = split[0],
      name = split[1];

  return {
    repo: repo,
    owner: owner,
    name: name
  };
}

function getDailyDate () {
  var dailyDay = moment().subtract(settings.days, 'days').startOf('day'),
      dayCount = dailyDay.get('day');

  if (dayCount === 6) { // saturday
    dailyDay = dailyDay.subtract(1, 'days');
  } else if (dayCount === 0) { // saturday
    dailyDay = dailyDay.subtract(2, 'days');
  }

  return dailyDay.format();
}

function getRepoCommits (repoData, branch) {
  return new Promise(function(resolve, reject) {
    client.get('/repos/' + repoData.owner + '/' + repoData.name + '/commits', {
      author: settings.username,
      since: getDailyDate(),
      sha: branch.name
    }, function(err, status, body, headers) {
      var commits = Array.prototype.slice.call(body);

      resolve(commits);
    });
  });
}

function printUnderline (str) {
  console.log(new Array(str.length + 1).join('='));
}

function printError (str) {
  console.log(rt('ERROR: ') + str);
}

function printInfo (str, printNewLine) {
  var newLine = printNewLine ? '\n' : '';
  console.log(newLine + ct('INFO: ') + str);
}

function printRepoData (repoData, branch) {
  var spacer = ' // ',
      headline = [
        ct(repoData.owner),
        bt(spacer),
        ct(repoData.name),
        bt(spacer),
        branch.name
      ].join('');

  console.log('\n' + headline);
  printUnderline(repoData.owner + spacer + repoData.name + spacer + branch.name);
};

function printCommit (commit) {
  var message = commit.commit.message,
      date = moment(commit.commit.committer.date).format('L HH:MM'),
      spacer = ' | ',
      dateSpacerCount = (date + spacer).length;

  message = message.replace(/\n/g, '\n' + new Array(dateSpacerCount + 1).join(' '));

  console.log(bt(date + spacer) + ct(message));
}

function printLimit () {
  return getLimit().then(function(limit) {
    printInfo('Requests left ' + limit.left + bt(' (max: ' + limit.max + ')'), true);
  })
}

function printDaily () {
  return getReposBranchesAndCommits().each(function(result) {
    result.branches.forEach(function(branch) {
      if (branch.commits.length) {
        printRepoData(result.repoData, branch);
        branch.commits.forEach(printCommit);
      }
    });
  });
}

function getOrganizationRepos () {
  return ghme.orgsAsync().then(function(result) {
    return mapOrganizations(result[0]);
  }).map(function(organization) {
    return organization.reposAsync();
  }).then(function(results) {
    var repositories = [];

    results.forEach(function(result) {
      repositories = repositories.concat(mapRepositories(result[0]));
    });

    return repositories;
  }).catch(function(e) {
    printError('Error occured while loading organization repos: ' + e);
    return [];
  });
}

function getRepos () {
  return ghme.reposAsync().then(function(result) {
    return mapRepositories(result[0]);
  }).catch(function(e) {
    printError('Error occured while loading repos: ' + e);
    return [];
  });
}

function getBranches (repo) {
  return repo.branchesAsync().then(function(result) {
    return result[0];
  });
}

function getLimit () {
  return Promise.promisify(client.limit)().then(function(result) {
    var left = result[0],
        max = result[1];

    return {
      left: left,
      max: max
    };
  });
}

function getAllRepos () {
  return Promise.join(getOrganizationRepos(), getRepos(), function(organizationRepos, repos) {

    if (!repos.length) {
      printInfo(settings.username + ' has no repositories.');
    } else {
      printInfo(repos.length + ' repositories found.');
    }

    if (!organizationRepos.length) {
      printInfo(settings.username + ' has no organization repositories.');
    } else {
      printInfo(organizationRepos.length + ' organization repositories found.');
    }

    return organizationRepos.concat(repos);
  });
}

function getReposBranchesAndCommits () {
  return getAllRepos().map(function(repository) {
    return Promise.all([
      getRepoData(repository),
      getBranches(repository)
    ]);
  }).map(function(result) {
    var repoData = result[0],
        branches = result[1],
        commits = [];

    branches.forEach(function(branch) {
      commits.push(getRepoCommits(repoData, branch));
    });

    return Promise.all([
      repoData,
      branches
    ].concat(commits));
  }).map(function(result) {
    var repoData = result[0],
        branches = result[1],
        commits = result.splice(2);

    branches.forEach(function(branch, index) {
      branch.commits = commits[index];
    });

    return {
      repoData: repoData,
      branches: branches
    }
  });
}

module.exports = {
  print: {
    info: printInfo,
    daily: printDaily,
    error: printError,
    limit: printLimit,
    commit: printCommit,
    repoData: printRepoData
  },
  init: init,
  limit: getLimit,
  getRepos: getRepos,
  getBranches: getBranches,
  getRepoCommits: getRepoCommits,
  getOrganizationRepos: getOrganizationRepos,
  getReposBranchesAndCommits: getReposBranchesAndCommits
};
