'use strict';

const TokenTypes = [
  'INT', 'CHAR', 'STRING', 'FLOAT', 'IDENTIFIER',
  'MEMBER_ACCESS', 'BINARY', 'UNARY', 'UNARY_OR_BINARY'
];

for (let type of TokenTypes) {
  exports[type] = Symbol(type);
}
