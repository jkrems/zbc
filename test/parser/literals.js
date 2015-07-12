'use strict';

const test = require('tape');

const parse = require('../../lib/parser');

test('Integer literals', function(t) {
  [ 0, 3, 1001, 42, 90 ].forEach(function(n) {
    const ast = parse(`f() { ${n}; }`);
    const literal = ast.body[0].body[0];
    t.equal(literal.value, n, `Parses integer literal ${n}`);
  });
  t.end();
});

test('Array literals', function(t) {
  const ast = parse(`f() { [ 0, 2 ]; }`);
  const literal = ast.body[0].body[0];
  t.deepEqual(literal.elements.map(function(el) {
    return el.value;
  }), [ 0, 2 ], 'Parses [ 0, 2 ]');
  t.end();
});
