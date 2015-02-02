'use strict';

const TokenTypes = [
  'INT', 'CHAR', 'STRING', 'FLOAT', 'IDENTIFIER',
  'ASSIGN', 'VISIBILITY', 'EXTERN',
  'MEMBER_ACCESS', // '.' / '->'
  'BINARY', 'UNARY', 'UNARY_OR_BINARY',
  'EOL', // ';'
  'LESS', 'MORE', // < / >
  'LPAREN', 'RPAREN', 'LBRACE', 'RBRACE', 'LSQUARE', 'RSQUARE',
  'SEP', 'COLON',
  'RETURN'
];

for (let type of TokenTypes) {
  exports[type] = Symbol(type);
}
exports.default = exports;
