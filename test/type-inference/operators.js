'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Address-of operator', function(t) {
  const ast = infer(`
f(x: Int32) { &x; }
`);
  const f = ast.body[0], operation = f.body[0];

  const Async = ast.scope.get('Async'),
        Int32 = ast.scope.get('Int32');

  checkType(t, operation, Async.create([ Int32.create() ]));
  t.end();
});

test('Dereference operator', function(t) {
  const ast = infer(`
f(x: Async<Int32>) { y = *x; y; &0; }
`);
  const f = ast.body[0], yRef = f.body[1];

  const Async = ast.scope.get('Async'),
        Int32 = ast.scope.get('Int32');

  checkType(t, yRef, Int32.create());
  t.end();
});
