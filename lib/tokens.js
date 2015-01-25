"use strict";

/* @flow */
var Token = function Token(type, text) {
  this.type = type;
  this.text = text;
};

exports.Token = Token;
var INT = exports.INT = 0;
var CHAR = exports.CHAR = 1;
var STRING = exports.STRING = 2;