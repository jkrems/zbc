'use strict';

const assert = require('assert');

const debug = require('debug')('zbc:lexer');

function Position(source, index) {
  this.source = source;
  this.index = index;
}

Position.prototype.toString = function() {
  const snippet = this.source.slice(this.index - 5, this.index + 5);
  return '' + this.index + ':{' + JSON.stringify(snippet) + '}';
};

function Token(type, text, position) {
  this.type = type;
  this.text = text;
  this.position = position;
}

// Only supports one or two-char operators
function makeOperatorScanner(operators, success, failure) {
  var texts = Object.keys(operators);

  var byFirstChar = {};
  texts.forEach(function(text) {
    if (!byFirstChar[text[0]]) {
      byFirstChar[text[0]] = {};
    }
    byFirstChar[text[0]][text[1] || ''] = operators[text];
  });

  return function(lexer) {
    let candidates = byFirstChar[lexer.c];
    if (!candidates) return failure;

    let candiate = candidates[lexer.next()];
    if (candiate !== undefined) {
      lexer.next();
      lexer.emit(candiate);
      return success;
    } else if (candidates[''] !== undefined) {
      lexer.emit(candidates[''])
      return success;
    } else {
      return failure;
    }
  }
}

function Lexer(source, initial, options) {
  if (!options) options = {};

  this.source = source;
  this.length = source.length;
  this.filename = options.filename;

  this.initialState = initial;
  this.start = 0;

  this.idx = 0;
  this.c = source[0];

  this.tokens = [];
}

Lexer.prototype.scan = function scan() {
  let state = this.initialState;

  while (state !== undefined && !this.isEOF()) {
    let lastIdx = this.start = this.idx;
    let newState = state(this);

    // To progress either the state or the index have to change.
    // This won't catch cycles but at least the basics.
    assert(this.idx !== lastIdx || newState !== state);

    state = newState;
  }

  if (!this.isEOF()) {
    throw this.syntaxError(`Unexpected ${this.c}`);
  }

  return this.tokens;
};

Lexer.prototype._emit = function(type, text) {
  debug('emit(%s): %j', type.toString(), text);
  this.tokens.push(new Token(type, text, new Position(this.source, this.start)));
};

Lexer.prototype.emit = function emit(type) {
  return this._emit(type, this.source.slice(this.start, this.idx));
};

Lexer.prototype.emitWrapped = function(type) {
  return this._emit(type,
    this.source.slice(this.start + 1, this.idx - 1));
};

Lexer.prototype.next = function next() {
  this.c = this.source[++this.idx];
  return this.c;
};

Lexer.prototype.back = function() {
  this.c = this.source[--this.idx];
  return this.c;
};

Lexer.prototype.isEOF = function() {
  return this.idx >= this.length;
};

Lexer.prototype.syntaxError = function syntaxError(message) {
  const err = new SyntaxError(`${message} at ${this.start}..${this.idx}`);
  err.filename = this.filename;
  err.start = this.start;
  err.end = this.idx;
  return err;
};

module.exports = Lexer;
module.exports.default = Lexer;
module.exports.Token = Token;
module.exports.makeOperatorScanner = makeOperatorScanner;
