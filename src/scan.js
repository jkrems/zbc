'use strict';

const assert = require('assert');

const Tokens = require('./tokens');
const Lexer = require('./lexer');

const scanOperators = Lexer.makeOperatorScanner({
  '=': Tokens.ASSIGN,
  '.': Tokens.MEMBER_ACCESS,
  '->': Tokens.MEMBER_ACCESS,
  '&': Tokens.UNARY_OR_BINARY,
  '&&': Tokens.BINARY,
  '-': Tokens.UNARY_OR_BINARY,
  '+': Tokens.BINARY,
  '*': Tokens.UNARY_OR_BINARY,
  '/': Tokens.BINARY,
  '<': Tokens.LESS,
  '>': Tokens.MORE,
  '<<': Tokens.BINARY,
  ';': Tokens.EOL,
  ':': Tokens.COLON,
  '(': Tokens.LPAREN,
  ')': Tokens.RPAREN,
  '{': Tokens.LBRACE,
  '}': Tokens.RBRACE,
  '[': Tokens.LSQUARE,
  ']': Tokens.RSQUARE,
  ',': Tokens.SEP
}, scanRoot);

function scanRoot(lexer) {
  while (isWhitespace(lexer.c)) { lexer.next(); }

  if (isDigit(lexer.c)) {
    return scanNumeric;
  } else if (isIdentStart(lexer.c)) {
    return scanIdentifier;
  }

  switch (lexer.c) {
    case "'": return scanChar;
    case '"': return scanString;
    case '#': return scanLineComment;
  }

  return scanOperators;
}

function scanLineComment(lexer) {
  while (lexer.c !== '\n') { lexer.next(); }
  lexer.next(); // skip over the new line
  return scanRoot;
}

function scanNumeric(lexer) {
  if (isDigit(lexer.c)) {
    while (isDigit(lexer.next())) { /* Consume all digits */ }
  }

  if (lexer.c !== '.') {
    lexer.emit(Tokens.INT);
    return scanRoot;
  }

  // Potential for floating point
  if (isDigit(lexer.next())) {
    while (isDigit(lexer.next())) { /* Consume all digits */ }
    lexer.emit(Tokens.FLOAT);
  } else {
    lexer.back(); // Oops. Might be just a dot operator
    lexer.emit(Tokens.INT);
  }

  return scanRoot;
}

function scanChar(lexer) {
  let c = lexer.next();
  if (c === '\\') {
    throw new Error('Not implemented');
  }
  if (lexer.next() !== '\'') {
    throw lexer.syntaxError('Invalid character literal');
  }

  lexer.next(); // Move to first after closing quote
  lexer.emitWrapped(Tokens.CHAR);
  return scanRoot;
}

function consumeStringChar(lexer) {
  if (lexer.isEOF()) { return false; }

  switch (lexer.c) {
    case '\\': lexer.next(); return true;
    case '"': return false;
  }
  return true;
}

function scanString(lexer) {
  assert(lexer.c === '"');

  do { lexer.next(); } while (consumeStringChar(lexer));

  if (lexer.c !== '"') {
    throw lexer.syntaxError('Could not find end of string');
  }

  lexer.next(); // Move to first after closing quote
  lexer.emitWrapped(Tokens.STRING);
  return scanRoot;
}

const KEYWORDS = Object.create(null, {
  'public': { value: Tokens.VISIBILITY },
  'extern': { value: Tokens.EXTERN },
  'return': { value: Tokens.RETURN }
});
function scanIdentifier(lexer) {
  do { lexer.next(); } while (isIdentPart(lexer.c));
  const text = lexer.currentText();
  lexer.emit(KEYWORDS[text] || Tokens.IDENTIFIER);
  return scanRoot;
}

function isIdentPart(c) {
  return isIdentStart(c) || isDigit(c);
}

function isIdentStart(c) {
  return c === '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function isDigit(c) {
  return c >= '0' && c <= '9';
}

function isWhitespace(c) {
  return c === ' ' || c === '\n';
}

function scan(source, options) {
  const lexer = new Lexer(source, scanRoot, options);
  return lexer.scan();
}

module.exports = scan;
module.exports.default = scan;
