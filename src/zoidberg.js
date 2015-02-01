'use strict';

const _lex = require('./scan')
const _parse = require('./parser');

function parse(raw) {
  return _parse(_lex(raw));
}
exports.parse = parse;
