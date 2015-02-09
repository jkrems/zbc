'use strict';
const path = require('path');
const fs = require('fs');

const escodegen = require('escodegen');
const debug = require('debug')('zoidberg:zoidberg');

const TypeSystem = require('./type-system');
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
  const types = new TypeSystem();
  types.register('Function');

  debug('<core>');
  const coreFilename = path.join(__dirname, '..', 'include', 'core.zb');
  const coreSource = fs.readFileSync(coreFilename, 'utf8');
  _infer(parse(coreSource), types);
  debug('</core>');

  function parseAndInferModule(source) {
    const moduleScope = types.createScope();
    return _infer(parse(source), moduleScope, loadModule);
  }

  function loadModule(name) {
    const filename = path.join(
      __dirname, '..', 'include', `${name}.zb`);

    const source = fs.readFileSync(filename, 'utf8');
    return parseAndInferModule(source);
  }

  const moduleScope = types.createScope();
  return _infer(parse(raw), moduleScope, loadModule);
}
exports.infer = infer;

function zb2js(raw) {
  const out = _toJS(infer(raw));
  out.jsSource = escodegen.generate(out.jsAst, {
    indent: '  ',
    comment: true
  });
  return out;
}
exports.zb2js = zb2js;
