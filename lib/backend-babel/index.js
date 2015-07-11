'use strict';

const assert = require('assert');

const babel = require('babel-core');

function toJS(zbAst, options) {
  const jsAst = toAcornAst(zbAst);
  return babel.pipeline.transformFromAst(jsAst, null, options);
}
module.exports = toJS;

function isMain(decl) {
  return decl.nodeType === 'FunctionDeclaration' && decl.name === 'main';
}

function createMain() {
  const entry = babel.parse(
`if (module === require.main) {
  new Promise(resolve => resolve(main(process.argv)))
    .then((code) => { process.exit(code); })
    .then(null, (err) => {
      setImmediate(function() { throw err; });
    });
}`).body[0];
  return entry;
}

function toAcornAst(zbAst) {
  const _transformers = {
    Module(node) {
      // TOOD: support for imports
      const declarations = node.body.map(_transform);
      const mainCall = node.body.filter(isMain).map(createMain);
      assert(mainCall.length <= 1, 'More than one main function in module');
      return {
        type: 'Program',
        sourceType: 'module',
        body: declarations.concat(mainCall)
      };
    },

    StringLiteral(node) {
      if (node.textTokens.length !== 1 || node.expressions.length !== 0) {
        throw new Error('Complex string literals not supported');
      }
      return { type: 'Literal', value: node.textTokens[0] };
    },

    Int32Literal(node) {
      return { type: 'Literal', value: node.value };
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

    IdentifierReference(node) {
      return { type: 'Identifier', name: node.id };
    },

    FunctionCall(node) {
      return {
        type: 'CallExpression',
        callee: {
          type: 'SequenceExpression',
          parenthesizedExpression: true,
          expressions: [
            { type: 'Literal', value: 0 },
            _transform(node.fn)
          ]
        },
        arguments: node.args.map(_transform)
      };
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
        params: node.params.map(function(param) {
          return { type: 'Identifier', name: param.name };
        }),
        async: ret.isResolved() && ret.type === Async,
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