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
  if (!type) { throw new Error('Missing type information'); }
  type = type.resolved();
  if (!type.type) { return '?'; }

  const base = type.type.name;
  const args = type.args;
  if (args.length > 0) {
    return base + '.<' + args.map(toJSType) + '>';
  }
  return base;
}

const transforms = {
  Module: function(node) {
    let body = node.body.map(toJS);
    const hasMain = node.body.some(function(decl) {
      return decl.getNodeType() === 'FunctionDeclaration' &&
             decl.id.name === 'main';
    });

    let comments = [];

    body = body.filter(function(n) {
      if (n.type === 'EmptyStatement') {
        comments = comments.concat(n.leadingComments);
        return false;
      }
      return true;
    });

    if (hasMain) {
      return {
        type: 'Program',
        body: body.concat(callMain()),
        leadingComments: comments
      };
    } else {
      return {
        type: 'Program',
        body: body,
        leadingComments: comments
      };
    }
  },

  ExternDeclaration: function(node) {
    return {
      type: 'EmptyStatement',
      leadingComments: [
        { value: ` global ${node.id.name} `}
      ]
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

    const retType = node.getReturnType();

    const jsDoc = '\n' +
      node.params.map(function(param) {
        return ` * @param ${param.name} {${toJSType(param.type)}}`;
      }).concat([
        ` * @returns {${toJSType(retType)}}`
      ]).join('\n') +
      '\n ';

    outNode.leadingComments = [ { value: jsDoc } ];

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

  MemberAccess: function(node) {
    switch (node.op) {
      case '.':
        return {
          type: 'MemberExpression',
          object: toJS(node.object),
          property: toJS(node.property),
          computed: false
        };

      case '->':
        // TODO: a whole lot of magic
        return {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: toJS(node.object),
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
                property: toJS(node.property),
                computed: false
              },
              expression: true
            }
          ]
        };

      default:
        throw new Error(`Unknown member operator: ${node.op}`);
    }
  },

  BinaryExpression: function(node) {
    const lType = node.left.type;
    const opPropName = `operator${node.op}`;
    const opProp = lType.getProperty(opPropName);
    const jsMacro = opProp && opProp.jsMacro;

    if (jsMacro) {
      return jsMacro(node, toJS);
    }

    return {
      type: 'BinaryExpression',
      operator: node.op,
      left: toJS(node.left),
      right: toJS(node.right)
    };
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
  },

  InterfaceDeclaration: function(node) {
    return { type: 'EmptyStatement', leadingComments: [] };
  }
};

function toJS(ast) {
  const transform = transforms[ast.getNodeType()];

  if (transform === undefined) {
    throw new Error(`Unsupported: ${ast.getNodeType()}`);
  }

  return transform(ast);
}

function registerMacros(types) {
  const Stream = types.get('Stream');
  const streamPush = Stream.getProperty('operator<<');
  streamPush.jsMacro = function(node, toJS) {
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
  }
}

function generateJS(ast) {
  registerMacros(ast.types);

  return toJS(ast);
}

module.exports = generateJS;
module.exports.default = generateJS;
