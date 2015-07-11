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
    t.deepEqual(s.operand.id, 'x', 'Correct operand (`x`)');
    t.end();
  });
});
