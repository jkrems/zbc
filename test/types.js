'use strict';

const test = require('tape');

const types = require('../lib/types'),
      Type = types.Type,
      TypeVariable = types.TypeVariable;

test('staticFields', function(t) {
  const Str = new Type('String', []),
        Int32 = new Type('Int32', []);

  Int32.type.staticFields.set('MaxValue', Int32.create());

  // inner{x}
  // inner{x} -> leaf
  // outer -> inner{x} -> leaf

  t.test('nested type variables: outer -> inner{x} -> leaf', function(t) {
    const inner = new TypeVariable();
    inner.staticFields.set('x', Str.create());
    t.equal(inner.toString(), '?{x:String}', 'appears when stringified');

    const leaf = new TypeVariable();
    inner.merge(leaf);

    const outer = new TypeVariable();
    outer.merge(inner);

    outer.staticFields.set('y', Int32.create());

    [ 'x', 'y' ].forEach(function(field) {
      t.ok(inner.staticFields.has(field), `inner has field ${field}`);
      t.ok(outer.staticFields.has(field), `outer has field ${field}`);
      t.ok(leaf.staticFields.has(field), `leaf has field ${field}`);
    });
    t.end();
  });

  t.test('types with static fields', function(t) {
    const outer = new TypeVariable();
    outer.staticFields.set('MaxValue', new TypeVariable());
    const leaf = Int32.type.create();
    outer.merge(leaf);
    t.equal(
      outer.staticFields.get('MaxValue').getActual().type, Int32,
      'Merges static fields with the actual type');
    t.end();
  });

  t.end();
});
