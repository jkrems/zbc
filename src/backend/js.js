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
      type: 'BlockStatement',
      body: [ {
        type: 'ExpressionStatement',
        expression: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: {
              type: 'NewExpression',
              callee: { type: 'Identifier', name: 'Promise' },
              arguments: [
                {
                  type: 'ArrowFunctionExpression',
                  params: [
                    { type: 'Identifier', name: 'resolve' }
                  ],
                  expression: false,
                  body: {
                    type: 'BlockStatement',
                    body: [ {
                      type: 'ExpressionStatement',
                      expression: {
                        type: 'CallExpression',
                        callee: { type: 'Identifier', name: 'resolve' },
                        arguments: [
                          {
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
                        ]
                      }
                    } ]
                  }
                }
              ]
            },
            property: { type: 'Identifier', name: 'then' }
          },
          arguments: [
            {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'process' },
              property: { type: 'Identifier', name: 'exit' }
            },
            {
              type: 'ArrowFunctionExpression',
              params: [ { type: 'Identifier', name: 'error' } ],
              expression: false,
              body: {
                type: 'BlockStatement',
                body: [ {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'CallExpression',
                    callee: { type: 'Identifier', name: 'setImmediate' },
                    arguments: [
                      {
                        type: 'ArrowFunctionExpression',
                        params: [],
                        expression: false,
                        body: {
                          type: 'BlockStatement',
                          body: [
                            {
                              type: 'ThrowStatement',
                              argument: { type: 'Identifier', name: 'error' }
                            }
                          ]
                        }
                      }
                    ]
                  }
                } ]
              }
            }
          ]
        }
      } ]
    }
  };
}

function toJSType(type) {
  if (!type || !type.type) { return '?'; }

  const base = type.type.name;
  const args = type.args;
  if (args.length > 0) {
    return base + '.<' + args.map(toJSType) + '>';
  }
  return base;
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
    const statements = node.body.map(function(expr, idx) {
      if (expr.getNodeType() === 'Return') {
        return {
          type: 'ReturnStatement',
          argument: toJS(expr.value)
        };
      } else if (expr.getNodeType() === 'Assignment') {
        return toJS(expr);
      } else {
        return {
          type: 'ExpressionStatement',
          expression: toJS(expr)
        };
      }
    });

    const decl = {
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
        body: statements
      }
    };
    const outNode = (node.visibility === 'public') ?
      { type: 'ExportDeclaration', declaration: decl } : decl;

    outNode.leadingComments = node.params.map(function(param) {
      return {
        range: 10,
        value: `\n * @param ${param.name} {${toJSType(param.type)}}\n `
      };
    });

    return outNode;
  },

  Assignment: function(node) {
    return {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: toJS(node.target),
          init: toJS(node.value)
        }
      ]
    };
  },

  Interpolation: function(node) {
    return {
      type: 'TemplateLiteral',
      quasis: node.elements.filter(function(e) {
        return e.getNodeType() === 'Literal' && typeof e.value === 'string';
      }).map(function(e) {
        return {
          type: 'TemplateElement',
          value: { raw: e.value }
        };
      }),
      expressions: node.elements.filter(function(e) {
        return e.getNodeType() !== 'Literal' || typeof e.value !== 'string';
      }).map(toJS)
    };
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
