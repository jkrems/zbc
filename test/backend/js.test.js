/* global describe, it */
'use strict';

const fs = require('fs');

const escodegen = require('escodegen');

const scan = require('../../src/scan');
const parse = require('../../src/parser');
const js = require('../../src/backend/js');

describe('js', function() {
  it('len.zb', function() {
    const source = `main(argv: Array<String>) {
  argv.length - 2;
}
`;
    const tokens = scan(source);
    const ast = parse(tokens);

    const jsAst = js(ast);
    const jsSource = escodegen.generate(jsAst, {
      indent: '  ',
      comment: true
    });
    fs.writeFileSync('examples/len.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });

  it('hello.zb', function() {
    const source = fs.readFileSync('examples/hello.zb', 'utf8');
    const tokens = scan(source);
    const ast = parse(tokens);

    const jsAst = js(ast);
    const jsSource = escodegen.generate(jsAst, {
      indent: '  ',
      comment: true
    });
    fs.writeFileSync('examples/hello.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });

  it('demo.zb', function() {
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
