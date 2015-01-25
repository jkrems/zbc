import * as assert from 'assertive';
import { each } from 'lodash';

import scan from '../lib/scan';
import { INT, CHAR, STRING } from '../lib/tokens';

const cases = {
  '': [],
  '10': [ [ INT, '10' ] ],
  '10 3': [ [ INT, '10' ], [ INT, '3' ] ],
  "'a'": [ [ CHAR, 'a' ] ],
  "1 'b' 3": [ [ INT, '1' ], [ CHAR, 'b' ], [ INT, '3' ] ],
  '1 "foo" 3': [ [ INT, '1' ], [ STRING, 'foo' ], [ INT, '3' ] ],
  '1 "f\\"oo" 3': [ [ INT, '1' ], [ STRING, 'f\\"oo' ], [ INT, '3' ] ]
};

describe('scan', () => {
  it('is a function', () => {
    assert.hasType(Function, scan);
  });

  each(cases, (expected, source) => {
    describe(JSON.stringify(source), () => {
      it('emits the correct tokens', () => {
        const tokens = scan(source);

        each(expected, ([type, text], idx) => {
          assert.equal('Token type mismatch', type, tokens[idx].type);
          assert.equal('Token text mismatch', text, tokens[idx].text);
        });
      });
    });
  });
});
