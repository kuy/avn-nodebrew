'use strict';

var util = require('util');
var child = require('child_process');
var semver = require('semver');
var Promise = require('bluebird');

var VERSION_REGEX = /(\w+)(?:-|@)(.+)/;
var STOP_REGEX = /^current:\s+/;

/**
 * Extract a name from a version (to support iojs)
 *
 * @function
 * @param {string} version
 * @return {string}
 */
function versionName(version) {
  var match = version.match(VERSION_REGEX);
  var name = match ? match[1] : null;
  if (name && name === 'iojs') {
    name = 'io';
  }
  return name;
};

/**
 * Extract just the version number from a version.
 *
 * @function
 * @param {string} version
 * @return {string}
 */
function versionNumber(version) {
  var match = version.match(VERSION_REGEX);
  return match ? match[2] : version;
};

/**
 * Sanitize raw output of 'nodebrew list' and return versions.
 *
 * @function
 * @param {string} raw
 * @return {Array[string]}
 */
function parseVersions(raw) {
  var versions = [];
  raw.split('\n').every(function (line) {
    if (!line || line === '' || STOP_REGEX.test(line)) {
      return false;
    }
    versions.push(line.trim());
    return true;
  });
  return versions;
}

/**
 * List all versions.
 *
 * @function
 * @return {Promise}
 */
function listVersions() {
  return new Promise(function (resolve, reject) {
    var stdout, stderr;
    // NOTE: use full path of nodebrew
    var nodebrew = child.spawn('nodebrew', ['list']);
    nodebrew.stdout.on('data', function (data) {
      stdout = data;
    });
    nodebrew.stderr.on('data', function (data) {
      stderr = data;
    });
    nodebrew.on('close', function (code) {
      if (code === 0) {
        resolve(parseVersions(stdout.toString()));
      } else {
        reject(new Error('nodebrew command error: ' + stderr.toString()));
      }
    });
  });
}

/**
 * Find a highest matched version from installed versions.
 *
 * @param {Array[string]} installed versions
 * @param {string} matching
 * @return {string}
 */
function findVersion(versions, matching) {
  var highestMatch = null;

  var mName = versionName(matching);
  var mNumber = versionNumber(matching);

  versions.forEach(function (v) {
    var vName = versionName(v);
    var vNumber = versionNumber(v);

    if (vName === mName && semver.satisfies(vNumber, mNumber)) {
      if (!highestMatch) { highestMatch = v; }
      else if (semver.gt(vNumber, versionNumber(highestMatch))) {
        highestMatch = v;
      }
    }
  });
  return highestMatch;
};

/**
 * Get installed version matching a given version.
 *
 * @param {string} matching
 * @return {Promise}
 */
function installedVersion(matching) {
  return Promise.resolve()
  .then(function () { return listVersions(); })
  .then(function (versions) {
    return findVersion(versions, matching);
  });
};

/**
 * Match a specific version.
 *
 * @param {string} version
 * @return {Promise}
 */
function match(version) {
  return Promise.resolve()
  .then(function() { return installedVersion(version); })
  .then(function(use) {
    var cmd = util.format('nodebrew use %s > /dev/null;', use);
    var result = { version: use, command: cmd };
    return use ? result :
      Promise.reject(new Error('no version matching ' + version));
  });
};

module.exports = {
  versionName: versionName,
  versionNumber: versionNumber,
  parseVersions: parseVersions,
  listVersions: listVersions,
  installedVersion: installedVersion,
  findVersion: findVersion,
  match: match
};
