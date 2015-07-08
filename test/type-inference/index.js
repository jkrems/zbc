'use strict';

const test = require('tape');

const infer = require('../..').infer;
const TypeInstance = require('../../lib/types').TypeInstance;

function checkType(t, node, expected) {
  if (node.type.isA(expected)) {
    t.pass(`Expected ${expected}, found ${node.type}`);
  } else {
    t.fail(`Expected ${expected}, found ${node.type}`);
  }
}

test('Infer string literal and return type', function(t) {
  const f = infer('f() { "x"; }').body[0];
  const str = f.body[0];
  const Str = f.scope.get('String'), F = f.scope.get('Function');

  checkType(t, str, Str.create());
  checkType(t, f, F.create([ Str.create() ]));

  t.end();
});

test('Infer unary expression', function(t) {
  const f = infer('f() { &"x"; }').body[0];
  const unary = f.body[0];
  const Str = f.scope.get('String'),
        F = f.scope.get('Function'),
        Async = f.scope.get('Async');

  checkType(t, unary, Async.create([ Str.create() ]));
  checkType(t, f, F.create([ Async.create([ Str.create() ]) ]));
  t.end();
});
