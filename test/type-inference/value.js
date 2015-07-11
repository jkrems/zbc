'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Store and return Int32', function(t) {
  const ast = infer('f() { n = 0; n; }');
  const f = ast.body[0];
  const assign = f.body[0];

  const Int32 = ast.scope.get('Int32'),
        F = ast.scope.get('Function');

  checkType(t, assign, Int32.create());
  checkType(t, f, F.create([ Int32.create() ]));
  t.end();
});

test('Value with type hint', function(t) {
  const ast = infer('f(x) { n: Int32 = x; n; }');
  const f = ast.body[0];
  const assign = f.body[0];

  const Int32 = ast.scope.get('Int32'),
        F = ast.scope.get('Function');

  checkType(t, assign, Int32.create());
  checkType(t, f, F.create([ Int32.create(), Int32.create() ]));
  t.end();
});
