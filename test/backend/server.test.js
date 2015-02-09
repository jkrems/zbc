/* global describe, it */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const assert = require('assertive');

const zb = require('../..');

describe('node server', function() {
  it('just listen & exit', function() {
    this.inFile = path.resolve('examples/server-listen.zb');
    this.outFile = path.resolve('examples/server-listen.js');

    const source = `
using http.{createServer};

main(argv) {
  server = createServer();
  server.listen(0);
  return 0;
}
`;
    const result = zb.zb2js(source);

    fs.writeFileSync(this.inFile, source);
    fs.writeFileSync(this.outFile, result.jsSource);

    console.log('\n--- in:\n%s\n--- out:\n%s', source, result.jsSource);
  });
});
