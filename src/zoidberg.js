'use strict';

const escodegen = require('escodegen');

const _lex = require('./scan')
const _parse = require('./parser');
const _infer = require('./infer');
const _toJS = require('./backend/js');

function parse(raw) {
  return _parse(_lex(raw));
}
exports.parse = parse;

function infer(raw) {
  return _infer(parse(raw));
}
exports.infer = infer;

function zb2js(raw) {
  const jsAst = _toJS(infer(raw));
  return escodegen.generate(jsAst, {
    indent: '  ',
    comment: true
  });
}
exports.zb2js = zb2js;
