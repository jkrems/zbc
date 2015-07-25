'use strict';

const test = require('tape');

const TypeInterface = require('../../lib/types/type-interface');

test('Getting and setting fields', function(t) {
  const Str = new TypeInterface('String');
  const Int32 = new TypeInterface('Int32');

  Str.setField('length', Int32);
  t.throws(
    function() { Str.setField('length', Str); },
    /Duplicate definition of String.length/, 'Fields can only be defined once');

  t.equal(Str.getField('length').type, Int32, 'Field can be retrieved');
  t.equal(Str.getField('length').name, 'length', 'Field record contains field name');
  t.throws(
    function() { Str.getField('xyz'); },
    /Unknown field String.xyz/, 'Throws on unknown fields');

  t.end();
});

test('Type parameter', function(t) {
  const Str = new TypeInterface('String')
  const Err = new TypeInterface('Error');
  const Result = new TypeInterface('Result', [
    'T', [ 'E', Err ]
  ]);

  t.equal(Result.paramCount, 2, 'Result takes two parameter');

  t.ok(Result.getParam('T').definition instanceof TypeInterface,
    'The definition of T is a type interface');

  t.equal(Result.getParam('E').definition, Err,
    'The definition of E is Error');

  t.throws(
    function() { Result.getParam('X'); },
    /Unknown type parameter Result.X/, 'Throws on unknown parameter');

  t.end();
});
