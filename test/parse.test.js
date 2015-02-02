/* global describe, it, before */
'use strict';

const assert = require('assertive');

const scan = require('../src/scan');
const parse = require('../src/parser');

describe('parse', function() {
  describe('Hello World', function() {
    before(function() {
      this.tokens = scan(`
        main(stdout) {
          stdout << "Hi!\\n";
        }
      `);
      this.ast = parse(this.tokens);
      this.body = this.ast.body;
    });

    it('emits 1 body element', function() {
      assert.equal(1, this.body.length);
    });
  });
});
