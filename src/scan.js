'use strict';

const equal = require('assert').equal;

const debug = require('debug')('zbc:scan');

const Tokens = require('./tokens');

const INT = Tokens.INT,
      CHAR = Tokens.CHAR,
      STRING = Tokens.STRING,
      Token = Tokens.Token;

const CHAR_STATE = 'CHAR',
      STRING_STATE = 'STRING',
      NUMBER_STATE = 'NUMBER',
      ROOT_STATE = 'ROOT';

function isDigit(c) {
  return c >= '0' && c <= '9';
}

function isWhitespace(c) {
  return c === ' ' || c === '\t' || c === '\n';
}

function _scan(source) {
  const tokens = [];

  let state = ROOT_STATE;
  let start = 0, idx = 0, c = source[0];

  function enter(newState) {
    start = idx;
    state = newState;
  }

  function emit(type) {
    const text = source.slice(start, idx);
    debug('emit(%s): %j', type.toString(), text);
    tokens.push(new Token(type, text));
    --idx; // Next iteration will increase again
  }

  function next() {
    c = source[++idx];
    return c;
  }

  function isEOF() {
    return idx >= source.length;
  }

  function syntaxError(message) {
    const err = new SyntaxError(`${message} at ${start}..${idx}`);
    err.start = start;
    err.end = idx;
    return err;
  }

  function prettyCurrent() {
    if (c === undefined) {
      return 'EOF';
    } else {
      return `${JSON.stringify(c)} (${c.charCodeAt(0)})`;
    }
  }

  for (; idx <= source.length; next()) {
    debug('Reading %j at %j', c, idx);

    switch (state) {
      case ROOT_STATE:
        if (isEOF()) continue;

        switch (c) {
          case '\'':
            enter(CHAR_STATE);
            continue;

          case '"':
            enter(STRING_STATE);
            continue;
        }

        if (isWhitespace(c)) {
          continue; // skip
        } else if (isDigit(c)) {
          enter(NUMBER_STATE);
          continue;
        }
        break;

      case CHAR_STATE:
        if (c === '\\') {
          throw new Error('Not implemented');
        }
        if (next() !== '\'') {
          throw syntaxError('Invalid character literal');
        }
        ++start;
        emit(CHAR);
        ++idx; // We do actually want to skip the closing quote
        enter(ROOT_STATE);
        continue;

      case STRING_STATE:
        if (isEOF()) break;

        switch (c) {
          case '\\':
            next();
            break;
          case '"':
            ++start;
            emit(STRING);
            ++idx;
            enter(ROOT_STATE);
        }
        continue;

      case NUMBER_STATE:
        if (isDigit(c)) {
          while (isDigit(next())) {
            // No need to go through the state machine for these
          }
        }
        emit(INT);
        enter(ROOT_STATE);
        continue;
    }
    throw syntaxError(`Unexpected ${prettyCurrent()} in ${state}`);
  }

  equal(state, ROOT_STATE); // sanity check

  return tokens;
}

function scan(source) {
  return _scan(source);
}

module.exports = scan;
module.exports.default = scan;
