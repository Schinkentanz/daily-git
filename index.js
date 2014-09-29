var npm = require('npm'),
    clc = require('cli-color'),
    Promise = require('bluebird'),
    moment = require('moment'),
    github = Promise.promisifyAll(require('octonode')),
    optimistArgv = require('optimist').argv,
    client = null, ghme = null,
    settings = {
      days: optimistArgv.days || 1
    };

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

function getRepoCommits (repoData) {
  return new Promise(function(resolve, reject) {
    client.get('/repos/' + repoData.owner + '/' + repoData.name + '/commits', {
      author: settings.username,
      since: getDailyDate()
    }, function(err, status, body, headers) {

      var commits = Array.prototype.slice.call(body);

      if (commits.length) {
        resolve(commits);
      }
    });
  });
}

function printUnderline (str) {
  var wtgb = clc.xterm(231); // white text

  console.log(wtgb(new Array(str.length + 1).join('=')));
}

function printHeadline (repoData) {
  var otgb = clc.xterm(202).bgXterm(236), // orange text, gray background
      wtgb = clc.xterm(231).bgXterm(236), // white text, gray background
      spacer = ' // ',
      headline = otgb(repoData.owner) + wtgb(spacer) + otgb(repoData.name);

  console.log('\n');
  console.log(headline);
  printUnderline(repoData.owner + spacer + repoData.name);
};

function printCommit (commit) {
  var otgb = clc.xterm(202).bgXterm(236), // orange text, gray background
      wtgb = clc.xterm(231).bgXterm(236); // white text, gray background

  var message = commit.commit.message,
      date = moment(commit.commit.committer.date).format('L HH:MM'),
      spacer = ' | ',
      dateSpacerCount = (date + spacer).length;

  message = message.replace(/\n/g, '\n' + new Array(dateSpacerCount + 1).join(' '));

  console.log(wtgb(date + spacer) + otgb(message));
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
  });
}

function getRepos () {
  return ghme.reposAsync().then(function(result) {
    return mapRepositories(result[0]);
  });
}

function doTheDailyGit () {
  Promise.join(getOrganizationRepos(), getRepos(), function(organizationRepos, repos) {
    var repositories = organizationRepos.concat(repos);

    repositories.forEach(function(repo) {
      var repoData = getRepoData(repo);

      getRepoCommits(repoData).then(function(commits) {
        printHeadline(repoData);
        commits.forEach(printCommit);
      });
    });
  });
}

module.exports = function() {
  npm.load({}, function() {
    settings.username = npm.config.get('dailygitUsername');
    settings.password = npm.config.get('dailygitPassword');

    client = github.client(settings.username && settings.password ? {
      username: settings.username,
      password: settings.password
    } : {});

    ghme = client.me();

    doTheDailyGit();
  });
}();
