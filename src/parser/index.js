'use strict';

// Generated parser, via grammar/zoidberg.pegjs
var Parser = require('../../grammar/zoidberg');

function parse(source) {
  return Parser.parse(source);
}

module.exports = parse;
