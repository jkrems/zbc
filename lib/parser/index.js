'use strict';

const grammarParser = require('../../grammar/zoidberg');

function parse(source, options) {
  return grammarParser.parse(source, options || {});
}
module.exports = parse;
module.exports['default'] = parse;
