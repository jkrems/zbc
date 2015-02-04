'use strict';
const typed = require('./typed');
const int = typed.int,
      fn = typed.fn;

describe('infer/assign', function() {
  describe('assign int', function() {
    it('transfers type info', typed`${fn([int])}f() { i = 81; i; }`);
  });
});
