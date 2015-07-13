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
  return babel.parse(
`if (module === require.main) {
  new Promise(resolve => resolve(main(process.argv)))
    .then((code) => { process.exit(code); })
    .then(null, (err) => {
      setImmediate(function() { throw err; });
    });
}`).body[0];
}

function createPuts() {
  return babel.parse('function puts(str) { console.log(str); }').body[0];
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
        body: declarations.concat(mainCall, [ createPuts() ])
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

    ArrayLiteral(node) {
      return {
        type: 'ArrayExpression',
        elements: node.elements.map(_transform)
      };
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

        case '*': {
          return {
            type: 'AwaitExpression',
            all: false,
            argument: _transform(node.operand)
          };
        }

        default:
          throw new Error(`Unsupported unary operator: ${node.op}`);
      }
    },

    IdentifierReference(node) {
      return { type: 'Identifier', name: node.id };
    },

    StaticAccess(node) {
      return {
        type: 'MemberExpression',
        object: _transform(node.base),
        property: { type: 'Identifier', name: node.field }
      };
    },

    PropertyRead(node) {
      return {
        type: 'MemberExpression',
        object: _transform(node.base),
        property: { type: 'Identifier', name: node.field }
      };
    },

    IndexAccess(node) {
      return {
        type: 'MemberExpression',
        object: _transform(node.base),
        property: _transform(node.index),
        computed: true
      };
    },

    MethodCall(node) {
      return {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: _transform(node.base),
          property: { type: 'Identifier', name: node.field }
        },
        arguments: node.args.map(_transform)
      };
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

    NamespaceDeclaration(node) {
      const declarations = node.body.map(_transform);
      const nsValue = {
        type: 'ReturnStatement',
        argument: {
          type: 'ObjectExpression',
          properties: node.body.map(function(decl) {
            return {
              type: 'Property',
              kind: 'init',
              shorthand: true,
              key: { type: 'Identifier', name: decl.name },
              value: { type: 'Identifier', name: decl.name }
            };
          })
        }
      };
      return {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [{
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: node.name },
          init: {
            type: 'CallExpression',
            callee: {
              type: 'FunctionExpression',
              params: [],
              body: {
                type: 'BlockStatement',
                body: declarations.concat([ nsValue ])
              }
            },
            arguments: []
          }
        }]
      };
    },

    AssignExpression(node) {
      return {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [{
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: node.target },
          init: _transform(node.expr)
        }]
      };
    },

    FunctionDeclaration(node) {
      const Async = node.scope.get('Async');
      const ret = node.getReturnType();

      function createAutoReturn(lastLine) {
        if (!lastLine) { return []; }
        let transformed = _transform(lastLine);
        if (transformed.type === 'VariableDeclaration') {
          transformed = transformed.declarations[0].init;
        }
        return [{
          type: 'ReturnStatement',
          argument: transformed
        }];
      }

      const normalLines = node.body.slice(0, -1).map(_transform);
      const returnStatement =
        createAutoReturn(node.body[node.body.length - 1]);

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
            if (expr.type === 'VariableDeclaration') {
              return expr;
            }
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
