'use strict';

const test = require('tape');

const parse = require('../../lib/parser');
const ZB = require('../../lib/nodes');

[ '&', '*' ].forEach(function(unaryOp) {
  test(`Unary '${unaryOp}'`, function(t) {
    const ast = parse( `f(x) { ${unaryOp}x; }`);
    const s = ast.body[0].body[0];
    t.ok(s instanceof ZB.UnaryExpression, 'statement is a UnaryExpression');
    t.equal(s.op, unaryOp, `Correct operator ("${unaryOp}")`);
    t.equal(s.operand.id, 'x', 'Correct operand (`x`)');
    t.end();
  });
});

[ '++', '+', '-', '*', '/', '%' ].forEach(function(binOp) {
  test(`Binary ${binOp}`, function(t) {
    const ast = parse(`f(x, y) { x ${binOp} y; }`);
    const s = ast.body[0].body[0];
    t.ok(s instanceof ZB.MethodCall, 'statement is a MethodCall');
    t.equal(s.field, `operator${binOp}`, `Calls method "operator${binOp}"`);
    t.equal(s.base.id, 'x', 'Called on `x`');
    t.equal(s.args.length, 1, 'Passed on argument');
    t.equal(s.args[0].id, 'y', 'Correct right operand (`y`)');
    t.end();
  });
});
