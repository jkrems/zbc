'use strict';

const test = require('tape');

// const TypeInterface = require('../../lib/types/type-interface');

const LC_A = 'a'.charCodeAt(0);
function generateLabelByIndex(idx) {
  return '?' + String.fromCharCode(LC_A + idx % 26) + ((idx / 26) | 0);
}

function createLabelGenerator() {
  let nextIdx = 0;
  return function generateLabel(name) {
    if (name) { return "'" + name; }
    return generateLabelByIndex(nextIdx++);
  };
}

const generateLabel = createLabelGenerator();

function proxyIfActual(self, methods) {
  methods.forEach(function(method) {
    const impl = self[method];
    self[method] = function _actualProxy() {
      if (this._actual) {
        return this._actual[method].apply(this._actual, arguments);
      }
      return impl.apply(this, arguments);
    };
  });
}

class TypeVariable {
  constructor(name) {
    this._label = generateLabel(name);
    this._actual = null;
    this._fields = new Map();

    proxyIfActual(this, [
      'toString', 'unify'
    ]);
  }

  _setActual(other) {
    // Turns this into a proxy of `other`
    this._actual = other;
    for (const pair of this._fields) {
      other.createFieldInstance(pair[0]).unify(pair[1]);
    }
  }

  createFieldInstance(name) {
    if (!this._fields.has(name)) {
      this._fields.set(name, new TypeVariable());
    }
    return this._fields.get(name);
  }

  unify(other) { this._setActual(other); }
  toString() { return this._label; }
}

test('generateLabelByIndex', function(t) {
  t.equal(generateLabelByIndex(0), '?a0', 'Starts generating w/ ?a0');
  t.equal(generateLabelByIndex(9), '?j0', 'Goes on with the alphabet');
  t.equal(generateLabelByIndex(25), '?z0', 'Reaches z');
  t.equal(generateLabelByIndex(27), '?b1', 'Adds numbers when it becomes too much');
  t.end();
});

test('Type variable rendering', function(t) {
  const v1 = new TypeVariable('v1');
  const v2 = new TypeVariable(),
        v3 = new TypeVariable();

  t.equal(String(v1), '\'v1', 'Render variable name, prefixed with "\'"');
  t.ok(/^\?[a-z][\d]+$/.test(String(v2)),
    `Generates variable name (${v2}) if none is provided`);
  t.notEqual(String(v2), String(v3),
    'Generated variable names are different')
  t.end();
});

test('Unifying two type variables', function(t) {
  const v1 = new TypeVariable('v1');
  const v2 = new TypeVariable('v2');
  const v3 = new TypeVariable('v3');

  v1.unify(v2);
  v1.unify(v3);
  t.equal(String(v2), String(v3), 'v2 ~= v3 after unification');
  t.equal(String(v1), String(v3), 'v1 ~= v3 after unification');

  t.equal(v1._actual, v2, 'v1 -> v2');
  t.equal(v2._actual, v3, 'v2 -> v3');

  t.end();
});

test('Fields of type variables', function(t) {
  const v1 = new TypeVariable('v1');
  const v2 = new TypeVariable('v2');

  const x = v1.createFieldInstance('x');
  t.ok(x instanceof TypeVariable, 'Returns a type variable');

  const x2 = v1.createFieldInstance('x');
  t.equal(x, x2, 'Subsequent calls return the same variable');

  const y = v1.createFieldInstance('y');
  t.notEqual(x, y, 'Different fields, different variables');

  const y2 = v2.createFieldInstance('y');
  t.notEqual(String(y), String(y2), 'Before unification, fields are independent');
  v1.unify(v2);
  t.equal(String(y), String(y2), 'After unification, fields match');

  t.end();
});
