/* @flow */
import {equal} from 'assert';

import {Token, INT, CHAR, STRING} from './tokens';

const debug = require('debug')('zbc:scan');

const ROOT_STATE = 'ROOT';
const CHAR_STATE = 'CHAR';
const STRING_STATE = 'STRING';
const NUMBER_STATE = 'NUMBER';

function isDigit(c) {
  return c >= '0' && c <= '9';
}

function isWhitespace(c) {
  return c === ' ' || c === '\t' || c === '\n';
}

function _scan(source: String) {
  const tokens = [];

  let state = ROOT_STATE;
  let start = 0, idx = 0, c = source[0];

  function enter(newState) {
    start = idx;
    state = newState;
  }

  function emit(type) {
    const text = source.slice(start, idx);
    debug('emit(%d): %j', type, text);
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
        let text = c;
        if (text === '\\') {
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

export default function scan(source: String): Array<Token> {
  return _scan(source);
}
