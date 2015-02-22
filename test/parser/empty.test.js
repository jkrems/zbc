'use strict';
const assert = require('assertive');

const ZB = require('../../src/nodes');
const parse = require('../../src/parser/index');

function assertEmptyModule(ast) {
  assert.truthy(ast instanceof ZB.Module);
  assert.deepEqual([], ast.body);
  assert.deepEqual([], ast.imports);
}

describe('parse:empty', function() {
  it('parses to empty ZB.Module', function() {
    assertEmptyModule(parse(''));
  });

  it('accepts comments', function() {
    assertEmptyModule(parse('# foo'));
  });

  it('accepts spaces and new lines', function() {
    assertEmptyModule(parse(' \n '));
  });

  it('does not accept tabs', function() {
    const err = assert.throws(function() { parse('\t'); });
    assert.equal('SyntaxError', err.name);
    assert.equal('Tabs aren\'t valid whitespace in Zoidberg', err.message);
  });
});
