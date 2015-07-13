'use strict';

const test = require('tape');

const infer = require('../..').infer;
const TypeVariable = require('../../lib/types').TypeVariable;

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

test('arr[0]', function(t) {
  const ast = infer('f(arr: Array<Int32>) { arr[0]; }')
  const f = ast.body[0], indexAccess = f.body[0];

  const F = ast.scope.get('Function'),
        Int32 = ast.scope.get('Int32'),
        Arr = ast.scope.get('Array');
  checkType(t, f, F.create([ Int32.create(), Arr.create([ Int32.create() ]) ]));

  t.end();
});

test('str.length', function(t) {
  const ast = infer('f(str: String) { str.length; }')
  const f = ast.body[0], propRead = f.body[0];

  const F = ast.scope.get('Function'),
        Int32 = ast.scope.get('Int32'),
        Str = ast.scope.get('String');
  checkType(t, f, F.create([ Int32.create(), Str.create() ]));

  t.end();
});

test('obj.prop', function(t) {
  const ast = infer('f(obj) { obj.prop; }');
  const f = ast.body[0], propRead = f.body[0];

  const F = ast.scope.get('Function'),
        a = new TypeVariable(),
        b = new TypeVariable();
  a.fields.set('prop', b);

  const expected = F.create([ b, a ]).toString();
  t.equal(f.type.toString(), expected,
    `has type signature ${expected}`);

  t.test('with incompatible type', function(t) {
    t.throws(function() {
      const ast = infer('f(x) { x.length; } g() { f(0); }');
    }, /Field not supported: length/, 'complains that field is not supported');
    t.end();
  });

  t.end();
});

test('arr.push(42)', function(t) {
  const ast = infer('f(arr) { arr.push(42); }');
  const f = ast.body[0], arrPush = f.body[0];

  const F = ast.scope.get('Function'),
        Int32 = ast.scope.get('Int32'),
        a = new TypeVariable(),
        b = new TypeVariable();
  a.fields.set('push', F.create([ b, Int32.create() ]));

  const expected = F.create([ b, a ]).toString();
  t.equal(f.type.toString(), expected,
    `has type signature ${expected}`);

  t.end();
});
