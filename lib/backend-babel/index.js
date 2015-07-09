'use strict';

const babel = require('babel-core');

function toJS(zbAst, options) {
  const jsAst = toAcornAst(zbAst);
  return babel.pipeline.transformFromAst(jsAst, null, options);
}
module.exports = toJS;

function toAcornAst(zbAst) {
  const _transformers = {
    Module(node) {
      // TOOD: support for imports
      return {
        type: 'Program',
        sourceType: 'module',
        body: node.body.map(_transform)
      }
    },

    StringLiteral(node) {
      if (node.textTokens.length !== 1 || node.expressions.length !== 0) {
        throw new Error('Complex string literals not supported');
      }
      return { type: 'Literal', value: node.textTokens[0] };
    },

    UnaryExpression(node) {
      switch (node.op) {
        case '&':
          return {
            type: 'CallExpression',
            callee: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'Promise' },
              property: { type: 'Identifier', name: 'resolve' }
            },
            arguments: [ _transform(node.operand) ]
          };

        default:
          throw new Error(`Unsupported unary operator: ${node.op}`);
      }
    },

    FunctionDeclaration(node) {
      const Async = node.scope.get('Async');
      const ret = node.getReturnType();

      const normalLines = node.body.slice(0, -1).map(_transform);
      const lastLine = node.body[node.body.length - 1];
      const returnStatement = lastLine ? [{
        type: 'ReturnStatement',
        argument: _transform(lastLine)
      }] : [];
      return {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: node.name },
        params: [],
        async: ret.type === Async,
        body: {
          type: 'BlockStatement',
          body: normalLines.map(function(expr) {
            return {
              type: 'ExpressionStatement',
              expression: expr
            };
          }).concat(returnStatement)
        }
      };
    }
  };

  function _transform(node) {
    const _transformer = _transformers[node.nodeType];
    if (!_transformer) {
      throw new Error(`Unsupported node: ${node.nodeType}`);
    }
    return _transformer(node);
  }

  return _transform(zbAst);
}

module.exports.toAcornAst = toAcornAst;
