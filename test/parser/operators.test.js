'use strict';
const assert = require('assertive');

var ZB = require('../../src/nodes');
var parse = require('../../src/parser/index');

function parsedBody(inner) {
  const ast = parse(`f() { ${inner} }`);
  return ast.body[0].body;
}

describe.only('parse/Operators', function() {
  it('parses an addition', function() {
    const body = parsedBody('7 + 9;');
    assert.truthy('body instanceof BinaryExpression',
      body instanceof ZB.BinaryExpression);
    assert.equal(7, body.left.value);
    assert.equal(9, body.right.value);
    assert.equal('+', body.op);
  });

  it('parses a stream pipe', function() {
    const body = parsedBody('stdout << 5;');
    assert.truthy('body instanceof BinaryExpression',
      body instanceof ZB.BinaryExpression);
    assert.equal('stdout', body.left.name);
    assert.equal(5, body.right.value);
    assert.equal('<<', body.op);
  });

  it('parses multiple operations', function() {
    const body = parsedBody('5 * 3 + 9;');
    assert.truthy('body instanceof BinaryExpression',
      body instanceof ZB.BinaryExpression);
    // (5 * 3) + 9
    assert.equal(5, body.left.left.value);
    assert.equal('*', body.left.op);
    assert.equal(3, body.left.right.value);
    assert.equal('+', body.op);
    assert.equal(9, body.right.value);
  });

  xit('knows about operator precedence', function() {
    const body = parsedBody('5 + 3 * 9;');
    assert.truthy('body instanceof BinaryExpression',
      body instanceof ZB.BinaryExpression);
    // 5 + (3 * 9)
    assert.equal(5, body.left.value);
    assert.equal('+', body.left.op);
    assert.equal(3, body.right.left.value);
    assert.equal('*', body.op);
    assert.equal(9, body.right.right.value);
  });
});
