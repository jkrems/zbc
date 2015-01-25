"use strict";

module.exports = scan;
/* @flow */
var equal = require("assert").equal;
var Token = require("./tokens").Token;
var INT = require("./tokens").INT;
var CHAR = require("./tokens").CHAR;
var STRING = require("./tokens").STRING;


var debug = require("debug")("zbc:scan");

var ROOT_STATE = "ROOT";
var CHAR_STATE = "CHAR";
var STRING_STATE = "STRING";
var NUMBER_STATE = "NUMBER";

function isDigit(c) {
  return c >= "0" && c <= "9";
}

function isWhitespace(c) {
  return c === " " || c === "\t" || c === "\n";
}

function _scan(source) {
  var enter = function (newState) {
    start = idx;
    state = newState;
  };

  var emit = function (type) {
    var text = source.slice(start, idx);
    debug("emit(%d): %j", type, text);
    tokens.push(new Token(type, text));
    --idx; // Next iteration will increase again
  };

  var next = function () {
    c = source[++idx];
    return c;
  };

  var isEOF = function () {
    return idx >= source.length;
  };

  var syntaxError = function (message) {
    var err = new SyntaxError("" + message + " at " + start + ".." + idx);
    err.start = start;
    err.end = idx;
    return err;
  };

  var prettyCurrent = function () {
    if (c === undefined) {
      return "EOF";
    } else {
      return "" + JSON.stringify(c) + " (" + c.charCodeAt(0) + ")";
    }
  };

  var tokens = [];

  var state = ROOT_STATE;
  var start = 0,
      idx = 0,
      c = source[0];

  for (; idx <= source.length; next()) {
    debug("Reading %j at %j", c, idx);

    switch (state) {
      case ROOT_STATE:
        if (isEOF()) continue;

        switch (c) {
          case "'":
            enter(CHAR_STATE);
            continue;

          case "\"":
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
        var text = c;
        if (text === "\\") {
          throw new Error("Not implemented");
        }
        if (next() !== "'") {
          throw syntaxError("Invalid character literal");
        }
        ++start;
        emit(CHAR);
        ++idx; // We do actually want to skip the closing quote
        enter(ROOT_STATE);
        continue;

      case STRING_STATE:
        if (isEOF()) break;

        switch (c) {
          case "\\":
            next();
            break;
          case "\"":
            ++start;
            emit(STRING);
            ++idx;
            enter(ROOT_STATE);
        }
        continue;

      case NUMBER_STATE:
        if (isDigit(c)) {
          while (isDigit(next())) {}
        }
        emit(INT);
        enter(ROOT_STATE);
        continue;
    }
    throw syntaxError("Unexpected " + prettyCurrent() + " in " + state);
  }

  equal(state, ROOT_STATE); // sanity check

  return tokens;
}

function scan(source) {
  return _scan(source);
}
// No need to go through the state machine for these