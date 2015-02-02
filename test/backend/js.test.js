/* global describe, it */
'use strict';

const fs = require('fs');

const zb = require('../..');

describe('js', function() {
  it('len.zb', function() {
    const source = `main(argv) {
  argv.length - 2;
}
`;
    const jsSource = zb.zb2js(source);
    fs.writeFileSync('examples/len.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });

  it('hello.zb', function() {
    const source = fs.readFileSync('examples/hello.zb', 'utf8');
    const jsSource = zb.zb2js(source);
    fs.writeFileSync('examples/hello.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });

  it('demo.zb', function() {
    const source = fs.readFileSync('examples/demo.zb', 'utf8');
    const jsSource = zb.zb2js(source);
    fs.writeFileSync('examples/demo.js', jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });
});
