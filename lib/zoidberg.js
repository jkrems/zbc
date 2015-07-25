'use strict';

const parse = require('./parser');
const trackScopes = require('./scopes');
const infer = require('./type-inference');
const _types = require('./types'),
      Type = _types.Type,
      TypeVariableFormatter = _types.TypeVariableFormatter;
const toJS = require('./backend-babel');

exports.parse = parse;

function registerBuiltIns(scope) {
  const Void = new Type('Void', []); scope.set('Void', Void);
  const Int32 = new Type('Int32', []); scope.set('Int32', Int32);
  const Str = new Type('String', []); scope.set('String', Str);
  const F = new Type('Function'); scope.set('Function', F);
  const Arr = new Type('Array', [ 'item' ]); scope.set('Array', Arr);
  const Async = new Type('Async', [ 'inner' ]); scope.set('Async', Async);

  Async.format = function format(args, varFmt) {
    varFmt = varFmt || new TypeVariableFormatter();
    return `${args[0].toString(varFmt)}*`;
  };

  F.format = function format(args, varFmt) {
    varFmt = varFmt || new TypeVariableFormatter();
    const ret = args[0];
    const params = args.slice(1).map(function(arg) {
      return arg.toString(varFmt);
    });
    return `(${params}) -> ${ret.toString(varFmt)}`;
  };

  Arr.format = function format(args, varFmt) {
    varFmt = varFmt || new TypeVariableFormatter();
    return `${args[0].toString(varFmt)}[]`;
  };
  Arr.fields.set('length', Int32.create());
  Arr.fields.set('push', F.create([ Int32.create(), Arr.param('item') ]));

  Str.fields.set('length', Int32.create());
  Str.fields.set('operator++', F.create([ Str.create(), Str.create() ]));

  scope.set('puts', {
    type: F.create([ Void.create(), Str.create() ])
  });
}

function _infer(source, moduleScope) {
  const ast = (typeof source === 'string') ?
    trackScopes(parse(source), moduleScope) : source;

  const rootScope = ast.scope.getRoot();
  if (!rootScope.has('String')) {
    registerBuiltIns(rootScope);
  }

  return infer(ast);
}
exports.infer = _infer;

function zb2js(source, options) {
  return toJS(_infer(source, options.moduleScope), options.babel);
}
exports.zb2js = zb2js;
