'use strict';

const _ = require('lodash');
var exec = require('child_process').exec;
const notifier = require('node-notifier');
const semver = require('semver');
const moment = require('moment');

var fs = require('fs');

try {
  var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (err) {
  throw Error('Please provide a valid config.json JSON file with a list of directories to monitor');
}

var statsInfoNpm = {};
var statsInfoBower = {};

// special cases.
function validateNpmPackageValue(value) {

    if (!value  ||
      !value.current ||
      value.current === 'MISSING' ||
      value.current === 'git' ||
      !value.latest ||
      value.latest === 'MISSING' ||
      value.latest === 'git' 
    ) {
       console.log ('WARNING: Unable to check npm package: ');
       console.log (value);
      return false;
    }

    return true;
}

// special cases.
function validateBowerPackageValue(value) {

    if (!value  ||
      !value.update ||
      !value.update.latest ||
      !value.pkgMeta ||
      !value.pkgMeta.version
    ) {
       console.log ('WARNING: Unable to check bower package: ');
       if (_.has(value, 'pkgMeta.name')) {
          console.log (value.pkgMeta.name);
       }
      return false;
    }

    return true;
}

function checkNpmPackages(data, monitoredDir) {

  if (!statsInfoNpm[monitoredDir]) {
    statsInfoNpm[monitoredDir] = 0;
  }
  statsInfoNpm[monitoredDir]++;
  console.log(moment().format() + ': Check # ' + statsInfoNpm[monitoredDir] + ' npm packages for ' + monitoredDir);

  _.each(data, function(value, key, info) {

    if (!validateNpmPackageValue(value)) 
    {
      return;
    }

    if (semver.gt(value.latest, value.current)) {
      notifier.notify({
        'title': 'Time to Upgrade ' + key,
        'message': 'From ' + value.current + ' to ' + value.latest + '\n' + monitoredDir
      });
    }
  });
}

function checkBowerPackages(data, monitoredDir) {

  if (!statsInfoBower[monitoredDir]) {
    statsInfoBower[monitoredDir] = 0;
  }
  statsInfoBower[monitoredDir]++;

  console.log(moment().format() + ': Check # ' + statsInfoBower[monitoredDir] + ' bower packages for ' + monitoredDir);
  _.each(data.dependencies, function(value, key, info) {
    if (!validateBowerPackageValue(value)) 
    { 
      return;
    }

    var latest = value.update.latest;
    var current = value.pkgMeta.version;

    if (semver.gt(latest, current)) {
      console.log('Time to Upgrade ' + key + ' from ' + current + ' to ' + latest);
      notifier.notify({
        'title': 'Time to Upgrade ' + key,
        'message': 'From ' + current + ' to ' + latest + '\n' + monitoredDir
      });
    }
  });
}

setInterval(function() {

  _.each(config.monitoredDirs, function(monitoredDir) {

    exec('npm outdated --json', {
      cwd: monitoredDir,
      maxBuffer: 1024 * 10000
    }, function(error, stdout, stderr) {
      //console.log('stdout: ' + stdout);
      //console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
        return;
      }

      if (!stdout) {
        return;
      }
      try {
        var parsed = JSON.parse(stdout);
        //console.log(JSON.stringify(parsed, null, 4));
        checkNpmPackages(JSON.parse(stdout), monitoredDir);
      } catch (err) {
        console.log(err);
      }
    });


    exec('bower list --json', {
      cwd: monitoredDir,
      maxBuffer: 1024 * 10000
    }, function(error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
        return;
      }
      if (!stdout) {
        return;
      }
      try {
        var parsed = JSON.parse(stdout);
        //console.log(JSON.stringify(parsed, null, 4));
        checkBowerPackages(JSON.parse(stdout), monitoredDir);
      } catch (err) {
        console.log(err);
      }
    });

  });


}, config.interval);
