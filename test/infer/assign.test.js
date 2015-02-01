'use strict';
const assert = require('assertive');

const zb = require('../..');

describe.only('infer/assign', function() {
  describe('assign int', function() {
    it('transfers type info', function() {
      const ast = zb.infer(`f() {
  i = 81;
}`);
      const f = ast.body[0];
      assert.equal('Function<Int>', f.type.toString());
    });
  });
});
