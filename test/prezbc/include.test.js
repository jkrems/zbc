'use strict';
const assert = require('assertive');

const preprocess = require('../../src/prezbc');

describe('preprocess: #include', function() {
  it('replaces local includes', function() {
    const loader = {
      loadLocal(filename) {
        return `# ${filename}\nMore\nLines`;
      }
    };
    const source = `# Lead\n#include "foo"\nOriginal`;
    assert.equal(
      `# Lead\n# foo\nMore\nLines\nOriginal`,
      preprocess(source, loader)
    );
  });

  it('replaces standard includes', function() {
    const loader = {
      loadStandard(filename) {
        return `# ${filename}\nMore\nLines`;
      }
    };
    const source = `# Lead\n#include <foo>\nOriginal`;
    assert.equal(
      `# Lead\n# foo\nMore\nLines\nOriginal`,
      preprocess(source, loader)
    );
  });

  it('only replaces whole lines', function() {
    assert.equal(' #include "x"', preprocess(' #include "x"'));
    assert.equal('#include "x" ', preprocess('#include "x" '));
  });
});
