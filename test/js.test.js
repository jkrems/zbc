'use strict';

const assert = require('assertive');
const escodegen = require('escodegen');

const scan = require('../src/scan');
const parse = require('../src/parser');
const js = require('../src/js');

describe.only('js', function() {
  it('does stuff', function() {
    const source = `main(argv) {
  stdout << argv->length.join(" :: ");
  stdout << "Hi!\\n";
}`;
    this.tokens = scan(source);
    const ast = parse(this.tokens);

    const jsAst = js(ast);
    const jsSource = escodegen.generate(jsAst, {
      indent: '  '
    });

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });
});
