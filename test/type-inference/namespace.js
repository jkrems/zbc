'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Scoping isolates to namespace', function(t) {
  t.test('symbols inside of the namespace can see each other', function(t) {
    const ast = infer('namespace ns { f() { 0; } g() { f(); } }');
    const g = ast.body[0].body[1];
    // g gets its type from f
    const F = ast.scope.get('Function'),
          Int32 = ast.scope.get('Int32');
    checkType(t, g, F.create([ Int32.create() ]));
    t.end();
  });

  t.test('prevents symbols from leaking', function(t) {
    t.throws(function() {
      infer('namespace ns { f() { 0; } } g() { f(); }')
    }, /Symbol not found: f/, 'Complains that f is not in scope');
    t.end();
  });

  t.test('allows using symbols from outer scope', function(t) {
    const ast = infer('f() { 0; } namespace ns { g() { f(); } }');
    const ns = ast.body[1];
    const g = ns.body[0];
    const F = ast.scope.get('Function'),
          Int32 = ast.scope.get('Int32');
    checkType(t, g, F.create([ Int32.create() ]));
    t.end();
  });

  t.end();
});
