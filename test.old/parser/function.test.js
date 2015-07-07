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

  it('parses a static function call', function() {
    const ast = parse('f() { b(); }');
    const f = ast.body[0];
    const fcall = f.body;
    assert.truthy('fcall instanceof FCallExpression',
      fcall instanceof ZB.FCallExpression);
    assert.equal(0, fcall.args.length);
    assert.truthy('callee instanceof Identifier',
      fcall.callee instanceof ZB.Identifier);
    assert.equal('b', fcall.callee.name);
  });

  it('parses a method call', function() {
    const ast = parse('f() { x.b(); }');
    const f = ast.body[0];
    const fcall = f.body;
    // FCallExpression(.b, [ x ]);
    assert.truthy('fcall instanceof FCallExpression',
      fcall instanceof ZB.FCallExpression);
    assert.equal(1, fcall.args.length);
    assert.equal('b', fcall.callee.name);
    assert.equal('x', fcall.args[0].name);
  });

  it('parses a function call with arguments', function() {
    const ast = parse('f() { b(42, 3); }');
    const f = ast.body[0];
    const fcall = f.body;
    assert.truthy('fcall instanceof FCallExpression',
      fcall instanceof ZB.FCallExpression);
    assert.equal(2, fcall.args.length);
    assert.equal('b', fcall.callee.name);
    assert.equal(42, fcall.args[0].value);
    assert.equal(3, fcall.args[1].value);
  });

  it('parses a method/function chain', function() {
    const ast = parse('f() { F().bar.x(7).y; }');
    const body = ast.body[0].body;
    // Member(FCall(.x(Member(Fcall(.F), 'bar'), 7), 'y')
    assert.truthy('body instanceof MemberAccess',
      body instanceof ZB.MemberAccess);
    assert.equal('y', body.property.name);
    assert.truthy('body.object instanceof FCallExpression',
      body.object instanceof ZB.FCallExpression);
    assert.equal('x', body.object.callee.name);
    assert.equal(2, body.object.args.length);
    assert.equal(7, body.object.args[1].value);

    // F().bar
    const Fbar = body.object.args[0];
    assert.equal('bar', Fbar.property.name);
    assert.equal('F', Fbar.object.callee.name);
  });

  xdescribe('member call', function() {
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

  xdescribe('namespace call', function() {
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

  xdescribe('return value, explicit', function() {
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
