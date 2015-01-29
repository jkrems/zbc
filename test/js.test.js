'use strict';

const assert = require('assertive');
const escodegen = require('escodegen');

const scan = require('../src/scan');
const parse = require('../src/parser');
const js = require('../src/js');

describe.only('js', function() {
  it('does stuff', function() {
    const source = `public main(argv) {
  # The other primitive types
  c = 'c'; n = 42; f = 0.2;

  name = "Quinn";
  stdout << "Static\\tEsc\\\\apes";
  stdout << "\\{name} says \\"Hello\\"";
  stdout << argv->length.join(" :: ");
  stdout << "Hello \\{name}!\\n";
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
