'use strict';

function Token(type, text) {
  this.type = type;
  this.text = text;
}

const TokenTypes = [
  'INT', 'CHAR', 'STRING'
];

exports.Token = Token;

for (let type of TokenTypes) {
  exports[type] = Symbol(type);
}
