/* global describe, it */
'use strict';
const assert = require('assertive');
const _ = require('lodash');

const scan = require('../src/scan');
const Tokens = require('../src/tokens');

function tokenized(splitSource) {
  const source = splitSource.join('');
  const expected = [].slice.call(arguments, 1);

  let pos = 0, tokenIdx = 0;
  for (let part of splitSource) {
    pos += part.length;
    if (tokenIdx < expected.length) {
      expected[tokenIdx].pos = pos;
    }
    ++tokenIdx;
  }

  return function() {
    const tokens = scan(source);

    assert.equal('Token count is correct', expected.length, tokens.length);

    _.each(expected, function(pair, idx) {
      const type = pair[0], text = pair[1];
      assert.equal(
        `Token type mismatch at #${idx} - ${type.toString()} vs. ${tokens[idx].type.toString()}`,
        type, tokens[idx].type);
      assert.equal('Token text mismatch at #' + idx,
        text, tokens[idx].text);
      assert.equal('Wrong position at #' + idx,
        pair.pos, tokens[idx].position.index);
    });
  };
}

function int(text) { return [ Tokens.INT, text ]; }
function char(text) { return [ Tokens.CHAR, text ]; }
function str(text) { return [ Tokens.STRING, text ]; }
function float(text) { return [ Tokens.FLOAT, text ]; }
function id(text) { return [ Tokens.IDENTIFIER, text ]; }
function access(text) { return [ Tokens.MEMBER_ACCESS, text ]; }
function bin(text) { return [ Tokens.BINARY, text ]; }
function op(text) { return [ Tokens.UNARY_OR_BINARY, text ]; }
function eol() { return [ Tokens.EOL, ';' ]; }
function lParen() { return [ Tokens.LPAREN, '(' ]; }
function rParen() { return [ Tokens.RPAREN, ')' ]; }
function lBrace() { return [ Tokens.LBRACE, '{' ]; }
function rBrace() { return [ Tokens.RBRACE, '}' ]; }

describe('scan', function() {
  it('scans an empty string to an empty list', tokenized``);

  it('scans an identifier', tokenized`${id('x')}x`);

  it('scans a single INT token', tokenized`${int('10')}10`);

  it('scans the dot operator', tokenized`${access('.')}.`);

  it('scans int member',
    tokenized`${int('3')}3${access('.')}.${id('foo')}foo`);

  it('scans +', tokenized`${int('3')}3 ${bin('+')}+ ${int('7')}7`);

  it('scans *', tokenized`${int('3')}3 ${op('*')}* ${int('7')}7`);

  it('scans /', tokenized`${int('3')}3 ${bin('/')}/ ${int('7')}7`);

  it('scans hello world', tokenized`
    ${id('stdout')}stdout ${bin('<<')}<< ${str('Hi!\\n')}"Hi!\\n"${eol()};
  `);

  it('scans a function decl', tokenized`
    ${id('main')}main${lParen()}(${rParen()}) ${lBrace()}{
    ${rBrace()}}
  `);

  it('scans two INTs', tokenized`${int('10')}10 ${int('3')}3`);

  it('scans a float', tokenized`${float('1.95883')}1.95883`);

  it('scans a single CHAR token', tokenized`${char('a')}'a'`);

  it('scans a CHAR surrounded by INTs',
    tokenized`${int('1')}1 ${char('b')}'b' ${int('3')}3`);

  it('scans STRING tokens',
    tokenized`${int('1')}1 ${str('foo')}"foo" ${int('3')}3`);

  it('scans escape sequences in strings',
    tokenized`${int('1')}1 ${str('f\\"oo')}"f\\"oo" ${int('3')}3`);

  it('fails when strings ends suddenly', function() {
    const err = assert.throws(_.partial(scan, '"foo'));
    assert.equal('Could not find end of string at 0..4', err.message);
  });
});
