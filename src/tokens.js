'use strict';

const TokenTypes = [
  'INT', 'CHAR', 'STRING', 'FLOAT', 'IDENTIFIER',
  'MEMBER_ACCESS', // '.' / '->'
  'BINARY', 'UNARY', 'UNARY_OR_BINARY',
  'EOL', // ';'
  'LPAREN', 'RPAREN', 'LBRACE', 'RBRACE',
  'SEP'
];

for (let type of TokenTypes) {
  exports[type] = Symbol(type);
}
