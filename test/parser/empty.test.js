'use strict';
var assert = require('assertive');

var ZB = require('../../src/nodes');
var parse = require('../../src/parser/index');

function assertEmptyModule(ast) {
  assert.truthy(ast instanceof ZB.Module);
  assert.deepEqual([], ast.body);
  assert.deepEqual([], ast.imports);
}

describe.only('parse:empty', function() {
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
    var err = assert.throws(function() { parse('\t'); });
    assert.equal('SyntaxError', err.name);
    assert.equal('Tabs aren\'t valid whitespace in Zoidberg', err.message);
  });
});
