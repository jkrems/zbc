'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('call function that returns an int', function(t) {
  const ast = infer(`
zero() { 0; }
f() { zero(); }`);
  const zero = ast.body[0], f = ast.body[1];

  const F = ast.scope.get('Function');
  const Int32 = ast.scope.get('Int32');

  checkType(t, zero, F.create([ Int32.create() ]));
  checkType(t, f.body[0].fn, F.create([ Int32.create() ]));
  checkType(t, f, F.create([ Int32.create() ]));

  t.end();
});

test('call with wrong param types', function(t) {
  t.throws(function() {
    infer(`
main(argv) { &0; }
f() { main("str"); }
`);
  }, /\(String\) -> Int32\* is not compatible with \(String\[\]\) -> Int32\*/);
  t.end();
});

test('namespace access', function(t) {
  const ast = infer(`
namespace ns { zero() { 0; } }
f() { ns::zero(); }`);
  const ns = ast.body[0], zero = ns.body[0], f = ast.body[1];

  const F = ast.scope.get('Function');
  const Int32 = ast.scope.get('Int32');
  checkType(t, f, F.create([ Int32.create() ]));

  t.end();
});
