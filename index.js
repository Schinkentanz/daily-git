var npm = require('npm'),
    clc = require('cli-color'),
    Promise = require('bluebird'),
    moment = require('moment'),
    github = Promise.promisifyAll(require('octonode')),
    argv = argv = require('minimist')(process.argv.slice(2)),
    client = null, ghme = null,
    settings = {
      days: argv.days || 1
    },
    ct = clc.cyanBright,
    bt = clc.blackBright,
    rt = clc.redBright;

module.exports = function() {
  npm.load({}, function() {
    settings.token = npm.config.get('daily-git:token');
    settings.username = npm.config.get('daily-git:username');

    if (!settings.token) {
      printError('Token is missing! Set it via:\n\tnpm config set daily-git:token <TOKEN>');
      return;
    }

    if (!settings.username) {
      printError('Username is missing! Set it via:\n\tnpm config set daily-git:username <USERNAME>');
      return;
    }

    client = github.client(settings.token);

    ghme = client.me();

    getLimit().then(doTheDailyGit);
  });
}();

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

      resolve({
        commits: commits,
        branch: branch
      });
    });
  });
}

function printUnderline (str) {
  console.log(new Array(str.length + 1).join('='));
}

function printError (str) {
  console.log(rt('ERROR: ') + str);
}

function printHeadline (repoData, branch) {
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
    var limit = 'Requests limit // left ' + result[0] + ' // max ' + result[1];

    console.log(bt(limit));
  });
}

function doTheDailyGit () {
  Promise.join(getOrganizationRepos(), getRepos(), function(organizationRepos, repos) {
    return organizationRepos.concat(repos);
  }).map(function(repository) {
    var repoData = getRepoData(repository);

    getBranches(repository).map(function(branch) {
      return getRepoCommits(repoData, branch);
    }).each(function(result) {
      if (result.commits.length) {
        printHeadline(repoData, result.branch);
        result.commits.forEach(printCommit);
      }
    })
  });
}
