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

test('Function with type hints', function(t) {
  const ast = infer(`
f(n: Int32, name): String { name; }
`);
  const f = ast.body[0];
  const nameRef = f.body[0];

  const F = ast.scope.get('Function'),
        Str = ast.scope.get('String'),
        Int32 = ast.scope.get('Int32');

  // return type propagates to nameRef
  checkType(t, nameRef, Str.create());

  // str <- (int32, str)
  checkType(t, f, F.create([ Str.create(), Int32.create(), Str.create() ]));

  t.end();
});

test('Function with complex type hints', function(t) {
  const ast = infer(`
f(n: Array<Int32>, name): Async<Array<String>> { &name; }
`);
  const f = ast.body[0];
  const nameRef = f.body[0];

  const F = ast.scope.get('Function'),
        Str = ast.scope.get('String'),
        Int32 = ast.scope.get('Int32'),
        Arr = ast.scope.get('Array'),
        Async = ast.scope.get('Async');

  // return type propagates to nameRef
  checkType(t, nameRef, Async.create([ Arr.create([ Str.create() ]) ]));

  // str[]* <- (int32[], str)
  checkType(t, f, F.create([
    Async.create([ Arr.create([ Str.create() ]) ]),
    Arr.create([ Int32.create() ]),
    Arr.create([ Str.create() ]) ]));

  t.end();
});
