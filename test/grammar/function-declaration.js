'use strict';

const test = require('tape');

const parse = require('../../lib/parser');
const ZB = require('../../lib/nodes');

test('Function w/ two params', function(t) {
  const ast = parse('f(a, b) {}');
  const f = ast.body[0];
  t.equal(f.params.length, 2, 'Has two parameters');
  for (const param of f.params) {
    t.ok(param instanceof ZB.Parameter, 'param is a Parameter');
  }
  t.equal(f.params[0].name, 'a', 'First has name "a"');
  t.equal(f.params[1].name, 'b', 'Second has name "b"');
  t.end();
});

test('Function w/ two string literals', function(t) {
  const ast = parse(
`f() {
  "a";
  "b";
}`);
  const f = ast.body[0];
  t.equal(f.body.length, 2, 'Has to statements in body');
  for (const statement of f.body) {
    t.ok(statement instanceof ZB.StringLiteral, 'statement is a StringLiteral');
  }
  t.deepEqual(f.body[0].textTokens, [ 'a' ], '#1 has one text token ("a")');
  t.deepEqual(f.body[1].textTokens, [ 'b' ], '#2 has one text token ("b")');
  t.end();
});

test('Function w/ a unary expression', function(t) {
  const ast = parse(
`getName() {
  &"Quinn";
}`);
  const f = ast.body[0];
  t.equal(f.body.length, 1, 'Has one statement in body');
  const s = f.body[0];
  t.ok(s instanceof ZB.UnaryExpression, 'statement is a UnaryExpression');
  t.equal(s.op, '&', 'Correct operator ("&")');
  t.deepEqual(s.operand.textTokens, [ 'Quinn' ], 'Correct operand ("Quinn")');
  t.end();
});
