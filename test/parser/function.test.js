'use strict';
const assert = require('assertive');

const zb = require('../..');

describe('parse/Function', function() {
  describe('member call', function() {
    before(function() {
      this.ast = zb.parse('f() { return a.b(); }');
      this.f = this.ast.body[0];
    });

    it('transforms to unified call', function() {
      const ret = this.f.body;
      assert.equal('Return', ret.getNodeType());
      const fcall = ret.value;
      assert.equal(1, fcall.args.length);
    });
  });

  describe('static call', function() {
    before(function() {
      this.ast = zb.parse('f() { return b(); }');
      this.f = this.ast.body[0];
    });

    it('transforms to unified call', function() {
      const ret = this.f.body;
      assert.equal('Return', ret.getNodeType());
      const fcall = ret.value;
      assert.equal(0, fcall.args.length);
    });
  });

  describe('namespace call', function() {
    before(function() {
      this.ast = zb.parse('f() { return a::b(); }');
      this.f = this.ast.body[0];
    });

    it('transforms to unified call', function() {
      const ret = this.f.body;
      assert.equal('Return', ret.getNodeType());
      const fcall = ret.value;
      assert.equal(0, fcall.args.length);
    });
  });

  describe('return value, explicit', function() {
    before(function() {
      this.ast = zb.parse(`f(): Int { 42; }`);
      this.body = this.ast.body;
      this.f = this.body[0];
    });

    it('has one declaration', function() {
      assert.equal(1, this.body.length);
    });

    it('generates a function called "f"', function() {
      assert.equal('FunctionDeclaration', this.f.getNodeType());
      assert.equal('f', this.f.name);
    });

    it('generates a Return(Literal(42)) body', function() {
      const fBody = this.f.body;
      assert.equal('Return', fBody.getNodeType());
      assert.equal('Literal', fBody.value.getNodeType());
      assert.equal(42, fBody.value.value);
    });

    it('does not handle any type stuff', function() {
      assert.falsey(this.types);
    });

    it('has a return type hint', function() {
      const returnHint = this.f.returnHint;
      assert.notEqual(null, returnHint);
      assert.equal('TypeHint', returnHint.getNodeType());
      assert.equal('Int', returnHint.name);
      assert.deepEqual([], returnHint.args);
    });
  });

  describe('return value, inferred', function() {
    before(function() {
      this.ast = zb.parse(`f() { 42; }`);
      this.f = this.ast.body[0];
    });

    it('has no return type hint', function() {
      assert.equal(null, this.f.returnHint);
    });
  });
});
