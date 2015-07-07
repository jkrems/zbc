'use strict';
const assert = require('assertive');

var ZB = require('../../src/nodes');
var parse = require('../../src/parser/index');

describe('parse:using', function() {
  it('parses a module w/ 1 import', function() {
    const ast = parse('using process.stdout;');
    assert.expect(ast instanceof ZB.Module);
    assert.deepEqual([], ast.body);
    assert.equal(1, ast.imports.length);
    assert.expect(ast.imports[0] instanceof ZB.Using);
    assert.deepEqual([ 'process', 'stdout' ], ast.imports[0].path);
    assert.equal(null, ast.imports[0].extractions);
  });

  it('parses import extractions', function() {
    const ast = parse('using process.{stdout,pid};');
    assert.deepEqual([], ast.body);
    assert.equal(1, ast.imports.length);
    assert.deepEqual([ 'process' ], ast.imports[0].path);
    assert.deepEqual([ 'stdout', 'pid' ], ast.imports[0].extractions);
  });

  it('parses multiple imports', function() {
    const ast = parse(`using process.stdout;
using http.{createServer,request};`);
    assert.deepEqual([], ast.body);
    assert.equal(2, ast.imports.length);
    assert.deepEqual([ 'createServer', 'request' ], ast.imports[1].extractions);
    assert.equal(null, ast.imports[0].extractions);
  });
});
