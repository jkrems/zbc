'use strict';

const test = require('tape');

const parse = require('../../lib/parser');
const ZB = require('../../lib/nodes');

test('Empty module', function(t) {
  const ast = parse('\n  \n \n\n ');
  t.deepEqual(ast.imports, [], 'Has no imports');
  t.deepEqual(ast.body, [], 'Has no declarations');
  t.end();
});

test('Module with two minimal function declarations', function(t) {
  const ast = parse('f() {}\ng() {}');
  t.deepEqual(ast.imports, [], 'Has no imports');
  t.equal(ast.body.length, 2, 'Has two declarations');
  for (const decl of ast.body) {
    t.ok(decl instanceof ZB.FunctionDeclaration, 'is FunctionDeclaration');
    t.deepEqual(decl.params, [], 'w/ empty params');
    t.deepEqual(decl.body, [], 'w/ empty body');
  }
  t.end();
});
