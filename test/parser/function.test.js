'use strict';
const assert = require('assertive');

var ZB = require('../../src/nodes');
var parse = require('../../src/parser/index');

describe('parse/Function', function() {
  it('parses an empty function', function() {
    const ast = parse('f() {}');
    assert.equal(1, ast.body.length);
    const f = ast.body[0];
    assert.equal('f', f.name);
    assert.deepEqual([], f.params);
    assert.truthy('body instanceof Empty', f.body instanceof ZB.Empty);
  });

  it('parses a function returning an integer literal', function() {
    const ast = parse(`f() { 0x1b; }`);
    const f = ast.body[0];
    assert.equal('f', f.name);
    assert.equal(null, f.returnHint);
    assert.truthy('body instanceof Literal', f.body instanceof ZB.Literal);
    assert.equal(27, f.body.value);
    assert.equal('Int', f.body.typeName);
  });

  it.only('parses an explicit return of a static function call', function() {
    const ast = parse('f() { return b(); }');
    const f = this.ast.body[0];
    const ret = f.body;
    assert.equal('Return', ret.getNodeType());
    const fcall = ret.value;
    assert.equal(0, fcall.args.length);
  });

  describe('member call', function() {
    before(function() {
      this.ast = parse('f() { return a.b(); }');
      this.f = this.ast.body[0];
    });

    it('transforms to unified call', function() {
      const ret = this.f.body;
      assert.equal('Return', ret.getNodeType());
      const fcall = ret.value;
      assert.equal(1, fcall.args.length);
    });
  });

  describe('namespace call', function() {
    before(function() {
      this.ast = parse('f() { return a::b(); }');
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
      this.ast = parse(`f(): Int { 42; }`);
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
});
