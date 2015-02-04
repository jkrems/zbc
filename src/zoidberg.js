'use strict';
const path = require('path');
const fs = require('fs');

const escodegen = require('escodegen');

const _preprocess = require('./prezbc');
const _lex = require('./scan')
const _parse = require('./parser');
const _infer = require('./infer');
const _toJS = require('./backend/js');

const STD_LIB = path.join(__dirname, '..', 'include');

const loader = {
  loadLocal() {
    throw new Error('Not implemented');
  },

  loadStandard(filename) {
    if (path.extname(filename) === '') {
      // TODO: smarter resolution logic
      filename = filename + '.zb';
    }
    const absolute = path.join(STD_LIB, filename);
    return fs.readFileSync(absolute, 'utf8');
  }
};

function parse(raw) {
  return _parse(_lex(_preprocess(raw, loader)));
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
