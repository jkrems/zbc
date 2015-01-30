'use strict';

const TokenTypes = [
  'INT', 'CHAR', 'STRING', 'FLOAT', 'IDENTIFIER',
  'ASSIGN', 'VISIBILITY',
  'MEMBER_ACCESS', // '.' / '->'
  'BINARY', 'UNARY', 'UNARY_OR_BINARY',
  'EOL', // ';'
  'LESS', 'MORE', // < / >
  'LPAREN', 'RPAREN', 'LBRACE', 'RBRACE',
  'SEP', 'COLON'
];

for (let type of TokenTypes) {
  exports[type] = Symbol(type);
}
exports.default = exports;
