'use strict';

const test = require('tape');

const parse = require('../..').parse;

test('fn(x, 3)', function(t) {
  const f = parse('f(x) { fn(x, 3); }').body[0];
  const fcall = f.body[0];
  t.equal(fcall.fn.id, 'fn', 'Refers to "fn"');
  t.equal(fcall.args.length, 2, 'Has two arguments');
  t.equal(fcall.args[1].value, 3, 'Second argument is 3');
  t.end();
});

test('ns::f', function(t) {
  const f = parse('f() { ns::f; }').body[0];
  const staticAccess = f.body[0];
  t.equal(staticAccess.base.id, 'ns', 'Refers to "ns"');
  t.equal(staticAccess.field, 'f', 'Selects "::f"');
  t.end();
});

test('arr[0]', function(t) {
  const f = parse('f() { arr[0]; }').body[0];
  const staticAccess = f.body[0];
  t.equal(staticAccess.base.id, 'arr', 'Refers to "arr"');
  t.equal(staticAccess.index.value, 0, 'Selects index 0');
  t.end();
});

test('obj.prop', function(t) {
  const f = parse('f() { obj.prop; }').body[0];
  const propertyRead = f.body[0];
  t.equal(propertyRead.base.id, 'obj', 'Refers to "obj"');
  t.equal(propertyRead.field, 'prop', 'Selects ".prop"');
  t.end();
});

test('obj.method(42)', function(t) {
  const f = parse('f(x) { obj.method(x, 42); }').body[0];
  const propertyRead = f.body[0];
  t.equal(propertyRead.base.id, 'obj', 'Refers to "obj"');
  t.equal(propertyRead.field, 'method', 'Selects ".method"');
  t.equal(propertyRead.args.length, 2, 'Calls with 2 arguments');
  t.equal(propertyRead.args[1].value, 42, '2nd argument is 42');
  t.end();
});
