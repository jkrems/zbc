/* global describe, it */
'use strict';

const fs = require('fs');

const escodegen = require('escodegen');

const scan = require('../../src/scan');
const parse = require('../../src/parser');
const js = require('../../src/backend/js');

describe('js', function() {
  it('does stuff', function() {
    const source = fs.readFileSync('examples/demo.zb', 'utf8');
    const tokens = scan(source);
    const ast = parse(tokens);

    const jsAst = js(ast);
    const jsSource = escodegen.generate(jsAst, {
      indent: '  ',
      comment: true
    });
    fs.writeFileSync('examples/demo.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });
});
