/* @flow */
import {Token, INT, CHAR, STRING} from './tokens';

const debug = require('debug')('zbc:scan');

const ROOT_STATE = 0;
const CHAR_STATE = 1;
const STRING_STATE = 2;

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

  function syntaxError(message) {
    const err = new SyntaxError(`${message} at ${start}..${idx}`);
    err.start = start;
    err.end = idx;
    return err;
  }

  for (; idx < source.length; next()) {
    switch (state) {
      case ROOT_STATE:
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
          start = idx;
          while (next() !== undefined && isDigit(c)) {
            // progress...
          }
          emit(INT);
          continue;
        }
        break;

      case CHAR_STATE:
        let text = c;
        if (text === '\\') {
          throw new Error('Not implemented');
        }
        next();
        if (c !== '\'') {
          throw syntaxError('Invalid character literal');
        }
        ++start;
        emit(CHAR);
        ++idx; // we do actually want to skip the closing quote
        enter(ROOT_STATE);
        continue;

      case STRING_STATE:
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
    }
    throw syntaxError(
      'Unexpected character: ' + JSON.stringify(c) + ' (' + c.charCodeAt(0) + ')'
    );
  }

  return tokens;
}

export default function scan(source: String): Array<Token> {
  return _scan(source);
}
