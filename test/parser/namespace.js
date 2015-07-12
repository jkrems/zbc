'use strict';

const test = require('tape');

const parse = require('../../lib/parser');

test('Empty namespace', function(t) {
  const ns = parse('namespace ns {}').body[0];
  t.equal(ns.name, 'ns', 'Finds namespace `ns`');
  t.deepEqual(ns.body, [], 'Namespace is empty');
  t.end();
});

test('Namespace w/ two functions', function(t) {
  const ns = parse(`
namespace ns {
  f() {}
  g(x) { x; }
}`).body[0];
  t.equal(ns.name, 'ns', 'Finds namespace `ns`');
  t.equal(ns.body.length, 2, 'Namespace contains 2 functions');
  t.equal(ns.body[0].name, 'f', 'First is `f`');
  t.equal(ns.body[1].name, 'g', 'Second is `g`');
  t.end();
});
