'use strict';

const test = require('tape');

const nodes = require('../../lib/nodes');

test('Create a Module node', function(t) {
  const m = new nodes.Module([ 'an-import' ], 'a-body');
  t.equal(m.body, 'a-body', 'Sets `body`');
  t.deepEqual(m.imports, [ 'an-import' ], 'Sets `imports`');
  t.end();
});
