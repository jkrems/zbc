'use strict';

const assert = require('assert');

const debug = require('debug')('zbc:lexer');

const Token = require('./token');
const Position = require('./position');
const makeOperatorScanner = require('./operator-scanner');

class Lexer {
  constructor(source, initial, options) {
    if (!options) options = {};

    this.source = source;
    this.maxIdx = options.maxIdx || source.length;
    this.filename = options.filename;

    this.initialState = initial;
    this.start = 0;

    this.idx = options.idx || 0;
    this.c = source[0];

    this.tokens = [];
  }

  scan() {
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
  }

  _emit(type, text) {
    debug('emit(%s): %j', type.toString(), text);
    this.tokens.push(new Token(type, text, new Position(this.source, this.start)));
  }

  currentText() {
    return this.source.slice(this.start, this.idx);
  }

  emit(type) {
    return this._emit(type, this.currentText());
  }

  currentWrappedText() {
    return this.source.slice(this.start + 1, this.idx - 1);
  }

  emitWrapped(type) {
    return this._emit(type, this.currentWrappedText());
  }

  next() {
    this.c = this.source[++this.idx];
    return this.c;
  }

  back() {
    this.c = this.source[--this.idx];
    return this.c;
  }

  isEOF() {
    return this.idx >= this.maxIdx;
  }

  syntaxError(message) {
    const err = new SyntaxError(`${message} at ${this.start}..${this.idx}`);
    err.filename = this.filename;
    err.start = this.start;
    err.end = this.idx;
    return err;
  }
}

module.exports = Lexer;
module.exports.default = Lexer;
module.exports.Token = Token;
module.exports.makeOperatorScanner = makeOperatorScanner;
