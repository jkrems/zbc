'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Infer string literal and return type', function(t) {
  const f = infer('f() { "x"; }').body[0];
  const str = f.body[0];
  const Str = f.scope.get('String'), F = f.scope.get('Function');

  checkType(t, str, Str.create());
  checkType(t, f, F.create([ Str.create() ]));

  t.end();
});

test('Infer int32 literal and return type', function(t) {
  const f = infer('f() { 42; }').body[0];
  const n = f.body[0];
  const Int32 = f.scope.get('Int32'), F = f.scope.get('Function');

  checkType(t, n, Int32.create());
  checkType(t, f, F.create([ Int32.create() ]));

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
