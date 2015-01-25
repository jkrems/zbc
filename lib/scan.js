"use strict";

module.exports = scan;
/* @flow */
var Token = require("./tokens").Token;
var INT = require("./tokens").INT;
var CHAR = require("./tokens").CHAR;
var STRING = require("./tokens").STRING;


var debug = require("debug")("zbc:scan");

var ROOT_STATE = 0;
var CHAR_STATE = 1;
var STRING_STATE = 2;

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

  var syntaxError = function (message) {
    var err = new SyntaxError("" + message + " at " + start + ".." + idx);
    err.start = start;
    err.end = idx;
    return err;
  };

  var tokens = [];

  var state = ROOT_STATE;
  var start = 0,
      idx = 0,
      c = source[0];

  for (; idx < source.length; next()) {
    switch (state) {
      case ROOT_STATE:
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
          start = idx;
          while (next() !== undefined && isDigit(c)) {}
          emit(INT);
          continue;
        }
        break;

      case CHAR_STATE:
        var text = c;
        if (text === "\\") {
          throw new Error("Not implemented");
        }
        next();
        if (c !== "'") {
          throw syntaxError("Invalid character literal");
        }
        ++start;
        emit(CHAR);
        ++idx; // we do actually want to skip the closing quote
        enter(ROOT_STATE);
        continue;

      case STRING_STATE:
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
    }
    throw syntaxError("Unexpected character: " + JSON.stringify(c) + " (" + c.charCodeAt(0) + ")");
  }

  return tokens;
}

function scan(source) {
  return _scan(source);
}
// progress...