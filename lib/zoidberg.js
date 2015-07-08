'use strict';

const parse = require('./parser');
const trackScopes = require('./scopes');
const infer = require('./type-inference');
const Type = require('./types').Type;

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

  scope.set('Function', F);
  scope.set('String', new Type('String', []));
  scope.set('Async', Async);
}

exports.infer = function (source) {
  const ast =
    (typeof source === 'string') ? trackScopes(parse(source)) : source;

  registerBuiltIns(ast.scope.getRoot());

  return infer(ast);
};
