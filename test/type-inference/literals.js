'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Array literal', function(t) {
  const ast = infer('f(x) { [ 10, x, 3 ]; }');
  const f = ast.body[0], literal = f.body[0];

  const Arr = ast.scope.get('Array'),
        Int32 = ast.scope.get('Int32'),
        F = ast.scope.get('Function');

  checkType(t, literal, Arr.create([ Int32.create() ]));
  checkType(t, f, F.create([ Arr.create([ Int32.create() ]), Int32.create() ]));
  t.end();
});
