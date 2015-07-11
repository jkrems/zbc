'use strict';

const test = require('tape');

const parse = require('../..').parse;

test('fn(x, 3)', function(t) {
  const f = parse('f(x) { fn(x, 3); }').body[0];
  const fcall = f.body[0];
  t.equal(fcall.fn.id, 'fn', 'Refers to "fn"');
  t.equal(fcall.args.length, 2, 'Has two arguments');
  t.equal(fcall.args[1].value, 3, 'Second argument is 3');
  t.end();
});