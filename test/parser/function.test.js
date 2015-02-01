'use strict';
const assert = require('assertive');

const zb = require('../..');

describe('parse/Function', function() {
  describe('return value, explicit', function() {
    before(function() {
      this.ast = zb.parse(`f(): Int { 42; }`);
      this.body = this.ast.body;
      this.f = this.body[0];
      this.types = this.ast.types;
    });

    it('has one declaration', function() {
      assert.equal(1, this.body.length);
    });

    it('generates a function called "f"', function() {
      assert.equal('FunctionDeclaration', this.f.getNodeType());
      assert.equal('f', this.f.id.name);
    });

    it('generates a Return(Literal(42)) body', function() {
      const fBody = this.f.body[0];
      assert.equal('Return', fBody.getNodeType());
      assert.equal('Literal', fBody.value.getNodeType());
      assert.equal(42, fBody.value.value);
    });

    it('exposes the type system used', function() {
      assert.truthy(this.types);
      const FunctionType = this.types.get('Function');
      const returnsInt = FunctionType.createInstance([
        this.types.get('Int').createInstance() ]);
      assert.equal('Function<Int>', String(returnsInt));
      assert.expect(this.f.type.equals(returnsInt));
    });
  });

  describe('return value, inferred', function() {
    before(function() {
      this.ast = zb.parse(`f() { 42; }`);
      this.f = this.ast.body[0];
      this.types = this.ast.types;
    });

    it('knows it returns an Int', function() {
      const FunctionType = this.types.get('Function');
      const returnsInt = FunctionType.createInstance([
        this.types.get('Int').createInstance() ]);
      assert.expect(this.f.type.equals(returnsInt));
    });
  });
});
