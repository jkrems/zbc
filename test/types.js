'use strict';

const test = require('tape');

const types = require('../lib/types'),
      Type = types.Type,
      TypeVariable = types.TypeVariable;

const Str = new Type('String', []),
      Int32 = new Type('Int32', []),
      F = new Type('Function');

Int32.type.staticFields.set('MaxValue', Int32.create());

test('Type.clone', function(t) {
  const a = new TypeVariable(),
        b = new TypeVariable();
  a.fields.set('len', b);

  const original = F.create([ b, a ]),
        cloned = original.clone()

  t.equal(original.toString(), 'Function<%a,%b.{len:%a}>',
    'original has expected type');
  t.equal(cloned.toString(), original.toString(),
    'cloned has expected type');
  t.end();
});

test('staticFields', function(t) {
  // inner{x}
  // inner{x} -> leaf
  // outer -> inner{x} -> leaf

  t.test('nested type variables: outer -> inner{x} -> leaf', function(t) {
    const inner = new TypeVariable();
    inner.staticFields.set('x', Str.create());
    t.equal(inner.toString(), '%a::{x:String}', 'appears when stringified');

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

test('fields of generic type', function(t) {
  // F<T>, Array<T> ::-> Every function definition *is* a type defintion
  // that defines a call operator.
  // Instantiating a function type ~= instantiating a generic type

  // Every type instance should get a view on type fields with type params
  // replaced w/ args
  const Either = new Type('Either', [ 'left', 'right' ]),
        left = Either.param('left'), right = Either.param('right');

  Either.fields.set('left', left);
  Either.fields.set('right', right);

  // It exposes type variables for left and right
  t.ok(left instanceof TypeVariable, 'param("left") is a TypeVariable');
  t.ok(right instanceof TypeVariable, 'param("right") is a TypeVariable');

  const Int32OrStr = Either.create([ Int32.create(), Str.create() ]);

  // It replaces the type variables without affecting the original
  t.equal(Int32OrStr.fields.get('left').type, Int32, '.left: Int32');
  t.equal(Int32OrStr.fields.get('right').type, Str, '.right: String');

  // No mutation to original type variables
  t.equal(left.getActual(), left, 'left is still unresolved');

  t.end();
});
