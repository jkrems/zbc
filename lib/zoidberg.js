'use strict';

const parse = require('./parser');
const trackScopes = require('./scopes');
const infer = require('./type-inference');
const Type = require('./types').Type;
const toJS = require('./backend-babel');

exports.parse = parse;

function registerBuiltIns(scope) {
  const Async = new Type('Async', [ 'T' ]);
  Async.format = function format(args) {
    return `${args[0]}*`;
  };

  const F = new Type('Function');
  F.format = function format(args) {
    const ret = args[0];
    const params = args.slice(1);
    return `(${params}) -> ${ret}`;
  };

  const Arr = new Type('Array', [ 'T' ]);
  Arr.format = function format(args) {
    return `${args[0]}[]`;
  };

  scope.set('Function', F);
  scope.set('String', new Type('String', []));
  scope.set('Int32', new Type('Int32', []));
  scope.set('Async', Async);
  scope.set('Array', Arr);
}

function _infer(source) {
  const ast =
    (typeof source === 'string') ? trackScopes(parse(source)) : source;

  registerBuiltIns(ast.scope.getRoot());

  return infer(ast);
}
exports.infer = _infer;

function zb2js(source, options) {
  return toJS(_infer(source), options);
}
exports.zb2js = zb2js;
