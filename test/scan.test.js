'use strict';
const assert = require('assertive');
const _ = require('lodash');

const scan = require('../src/scan');
const Tokens = require('../src/tokens');

const INT = Tokens.INT,
      CHAR = Tokens.CHAR,
      STRING = Tokens.STRING;

function tokenized(splitSource) {
  const source = splitSource.join('');
  const expected = [].slice.call(arguments, 1);

  return function() {
    const tokens = scan(source);

    assert.equal('Token count is correct', expected.length, tokens.length);

    _.each(expected, function(pair, idx) {
      const type = pair[0], text = pair[1];
      assert.equal('Token type mismatch', type, tokens[idx].type);
      assert.equal('Token text mismatch', text, tokens[idx].text);
    });
  };
}

function int(text) { return [ INT, text ]; }
function char(text) { return [ CHAR, text ]; }
function str(text) { return [ STRING, text ]; }

describe('scan', function() {
  it('parses an empty string to an empty list', tokenized``);

  it('can parse a single INT token', tokenized`${int('10')}10`);

  it('can parse two INTs', tokenized`${int('10')}10 ${int('3')}3`);

  it('can parse a single CHAR token', tokenized`${char('a')}'a'`);

  it('can parse a CHAR surrounded by INTs',
    tokenized`${int('1')}1 ${char('b')}'b' ${int('3')}3`);

  it('can parse STRING tokens',
    tokenized`${int('1')}1 ${str('foo')}"foo" ${int('3')}3`);

  it('can parse escape sequences in strings',
    tokenized`${int('1')}1 ${str('f\\"oo')}"f\\"oo" ${int('3')}3`);

  it('fails when strings ends suddenly', function() {
    const err = assert.throws(_.partial(scan, '"foo'));
    assert.include('Unexpected EOF', err.message);
  });
});
