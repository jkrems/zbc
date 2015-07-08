'use strict';

const parse = require('./parser');
const trackScopes = require('./scopes');
const infer = require('./type-inference');
const Type = require('./types').Type;

exports.parse = parse;

function registerBuiltIns(scope) {
  scope.set('Function', new Type('Function'));
  scope.set('String', new Type('String', []));
  scope.set('Async', new Type('Async', [ 'T' ]));
}

exports.infer = function(source) {
  const ast =
    (typeof source === 'string') ? trackScopes(parse(source)) : source;

  registerBuiltIns(ast.scope.getRoot());

  return infer(ast);
}
