'use strict';

const test = require('tape');

const parse = require('../../lib/parser');

test('Declare value', function(t) {
  const ast = parse('f() { code = 0; }');
  const assign = ast.body[0].body[0];
  t.equal(assign.target, 'code', 'Assigns to `code`');
  t.equal(assign.expr.value, 0, 'Assigns 0');
  t.end();
});

test('Declare value with type hint', function(t) {
  const ast = parse('f(x) { code: Int32 = x; }');
  const assign = ast.body[0].body[0];
  t.equal(assign.target, 'code', 'Assigns to `code`');
  t.equal(assign.expr.id, 'x', 'Assigns value of `x`');
  t.end();
});
