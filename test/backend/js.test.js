/* global describe, it */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const assert = require('assertive');

const zb = require('../..');

describe('js', function() {
  it('len.zb', function() {
    const source = `
main(argv) {
  argv.length - 2;
}
`;
    const result = zb.zb2js(source);
    fs.writeFileSync('examples/len.js', result.jsSource);

    // console.log('\n--- in:\n%s\n--- out:\n%s', source, result.jsSource);
  });

  it('hello.zb', function() {
    this.inFile = 'examples/hello.zb';
    this.outFile = 'examples/hello.js';

    const source = `#include <node>

main(argv: String[]) {
  process.stdout << "Hello World\n";
  0;
}
`;
    const result = zb.zb2js(source);

    fs.writeFileSync(this.inFile, source);
    fs.writeFileSync(this.outFile, result.jsSource);

    // console.log('\n--- in:\n%s\n--- out:\n%s', source, result.jsSource);
  });

  describe('demo.zb', function() {
    before('compiled', function() {
      this.inFile = 'examples/demo.zb';
      this.outFile = path.resolve('examples/demo.js');

      const source = `#include <node>

main(argv: String[]) {
  # The other primitive types
  c: Char = 'c'; n: Int = 42 + process.pid; f: Float = 0.2;

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
      const result = zb.zb2js(source);

      fs.writeFileSync(this.inFile, source);
      fs.writeFileSync(this.outFile, result.jsSource);

      console.log('\n--- in:\n%s\n--- out:\n%s', source, result.jsSource);
    });

    it('runs', function(done) {
      this.timeout(400);
      this.slow(300);

      const nodeExecLen = process.execPath.length;

      const outFile = this.outFile;
      const child = cp.fork(outFile, [], {
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
${nodeExecLen} :: ${outFile.length}
Hello Quinn!
`, stdout);
        done();
      });
    });
  });
});
