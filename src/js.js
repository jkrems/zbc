'use strict';

function callMain() {
  return {
    type: 'IfStatement',
    test: {
      type: 'BinaryExpression',
      operator: '===',
      left: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'require' },
        property: { type: 'Identifier', name: 'main' },
        computed: false
      },
      right: {
        type: 'Identifier',
        name: 'module'
      }
    },
    consequent: {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'main' },
        arguments: [
          {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'process' },
            property: { type: 'Identifier', name: 'argv' },
            computed: false
          }
        ]
      }
    }
  };
}

const transforms = {
  Module: function(node) {
    const body = node.body.map(toJS);
    const hasMain = node.body.some(function(decl) {
      return decl.getNodeType() === 'FunctionDeclaration' &&
             decl.id.name === 'main';
    });
    if (hasMain) {
      return { type: 'Program', body: body.concat(callMain()) };
    } else {
      return { type: 'Program', body: body };
    }
  },

  FunctionDeclaration: function(node) {
    return {
      type: 'FunctionDeclaration',
      id: {
        type: 'Identifier',
        name: node.id.name
      },
      params: node.params.map(function(param) {
        return {
          type: 'Identifier',
          name: param.name
        };
      }),
      expression: false,
      body: {
        type: 'BlockStatement',
        body: node.body.map(function(expr, idx) {
          if (idx + 1 < node.body.length) {
            return {
              type: 'ExpressionStatement',
              expression: toJS(expr)
            };
          }
          return {
            type: 'ReturnStatement',
            argument: toJS(expr)
          };
        })
      }
    }
  },

  BinaryExpression: function(node) {
    switch (node.op) {
      case '<<':
        // TODO: check for overloading...
        // Assuming stream here
        return {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: toJS(node.left),
            property: { type: 'Identifier', name: 'write' },
            computed: false
          },
          arguments: [ toJS(node.right) ]
        };

      case '.':
        return {
          type: 'MemberExpression',
          object: toJS(node.left),
          property: toJS(node.right),
          computed: false
        };

      case '->':
        // TODO: a whole lot of magic
        return {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: toJS(node.left),
            property: { type: 'Identifier', name: 'map' },
            computed: false
          },
          arguments: [
            {
              type: 'ArrowFunctionExpression',
              params: [ { type: 'Identifier', name: 'x' } ],
              body: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: 'x' },
                property: toJS(node.right),
                computed: false
              },
              expression: true
            }
          ]
        };

      default:
        return {
          type: 'BinaryExpression',
          operator: node.op,
          left: toJS(node.left),
          right: toJS(node.right)
        };
    }
  },

  FCallExpression: function(node) {
    return {
      type: 'CallExpression',
      callee: toJS(node.callee),
      arguments: node.args.map(toJS)
    };
  },

  Identifier: function(node) {
    return {
      type: 'Identifier',
      name: node.name
    };
  },

  Literal: function(node) {
    return {
      type: 'Literal',
      value: node.value
    };
  }
};

function toJS(ast) {
  const transform = transforms[ast.getNodeType()];

  if (transform === undefined) {
    throw new Error(`Unsupported: ${ast.getNodeType()}`);
  }

  return transform(ast);
}

module.exports = toJS;
module.exports.default = toJS;
