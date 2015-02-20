'use strict';

// Generated parser, via grammar/zoidberg.pegjs
var Parser = require('./_parser');

function parse(source) {
  return Parser.parse(source);
}

module.exports = parse;
