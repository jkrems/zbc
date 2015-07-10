'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Generic identity function', function(t) {
  const ast = infer(`
id(x) { x; }
f() { id("Q"); &id(0); }
`);
  const id = ast.body[0], f = ast.body[1];
  const strCall = f.body[0], intCall = f.body[1];

  const Str = ast.scope.get('String'),
        Async = ast.scope.get('Async'),
        Int32 = ast.scope.get('Int32');

  checkType(t, strCall, Str.create());
  checkType(t, intCall, Async.create([ Int32.create() ]));
  t.end();
});
