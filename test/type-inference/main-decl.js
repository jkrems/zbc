'use strict';

const test = require('tape');

const infer = require('../..').infer;

const checkType = require('../util').checkType;

test('Fail on invalid main type', function(t) {
  t.throws(function() {
    infer('main() { &"Quinn"; }');
  }, /\(\) -> String\* is not compatible with \(String\[\]\) -> Int32\*/);
  t.end();
});

test('Succeed on valid main type', function(t) {
  const f = infer('main(argv) { &0; }').body[0];
  const Str = f.scope.get('String'),
        F = f.scope.get('Function'),
        Int32 = f.scope.get('Int32'),
        Async = f.scope.get('Async'),
        Arr = f.scope.get('Array');
  checkType(t, f, F.create([
    Async.create([ Int32.create() ]),
    Arr.create([ Str.create() ])
  ]));
  t.end();
});
