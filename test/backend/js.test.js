/* global describe, it */
'use strict';
const fs = require('fs');
const cp = require('child_process');

const assert = require('assertive');

const zb = require('../..');

describe('js', function() {
  it('len.zb', function() {
    const source = `main(argv) {
  argv.length - 2;
}
`;
    const jsSource = zb.zb2js(source);
    fs.writeFileSync('examples/len.js', jsSource);

    // console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });

  it('hello.zb', function() {
    const source = fs.readFileSync('examples/hello.zb', 'utf8');
    const jsSource = zb.zb2js(source);
    fs.writeFileSync('examples/hello.js', jsSource);

    // console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
  });

  describe('demo.zb', function() {
    before('compiled', function() {
      this.inFile = 'examples/demo.zb';
      this.outFile = 'examples/demo.js';

      const source = `#include <node>

main(argv: String[]) {
  # The other primitive types
  c: Char = 'c'; n: Int = 42; f: Float = 0.2;

  stdout: Stream = process.stdout;

  name: String = "Quinn";
  stdout << "Static\\tEsc\\\\apes\\n";
  stdout << "\\{name} says \\"Hello\\"\\n";
  stdout << argv->length.join(" :: ");
  stdout << "\\n";
  stdout << "Hello \\{name}!\\n";
  0;
}
`;
      const jsSource = zb.zb2js(source);

      fs.writeFileSync(this.inFile, source);
      fs.writeFileSync(this.outFile, jsSource);

      // console.log('\n--- in:\n%s\n--- out:\n%s', source, jsSource);
    });

    it('runs', function(done) {
      this.timeout(400);
      this.slow(300);

      const child = cp.fork(this.outFile, [], {
        execArgv: [ '--harmony', '--harmony_arrow_functions' ],
        silent: true
      });
      child.stderr.pipe(process.stderr);

      let stdout = '';
      child.stdout.on('data', function(chunk) {
        stdout += chunk.toString('utf8');
      });

      child.on('exit', function(exitCode) {
        assert.equal(0, exitCode);
        assert.equal(`Static\tEsc\\apes
Quinn says "Hello"
51 :: 54
Hello Quinn!
`, stdout);
        done();
      });
    });
  });
});
