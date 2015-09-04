'use strict';

var name = require('../package.json').name;
var nodebrew = require('./nodebrew');

module.exports = {
  name: name,
  match: nodebrew.match,
  _findVersion: nodebrew.findVersion
};
