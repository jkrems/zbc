'use strict';

const fs = require('fs');

const assert = require('assertive');
const escodegen = require('escodegen');

const scan = require('../src/scan');
const parse = require('../src/parser');
const js = require('../src/js');

describe('js', function() {
  it('does stuff', function() {
    const source = fs.readFileSync('examples/demo.zb', 'utf8');
    this.tokens = scan(source);
    const ast = parse(this.tokens);

    const jsAst = js(ast);
    const jsSource = escodegen.generate(jsAst, {
      indent: '  ',
      comment: true
    });
    fs.writeFileSync('examples/demo.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });
});
