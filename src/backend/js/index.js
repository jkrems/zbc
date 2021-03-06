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
  if (!type.name) { return '?'; }

  const base = type.name;
  const args = type.args;
  if (args.length > 0) {
    return base + '.<' + args.map(toJSType) + '>';
  }
  return base;
}

function bluebirdImport() {
  return {
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'Promise' },
        init: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'require' },
          arguments: [ { type: 'Literal', value: 'bluebird' } ]
        }
      }
    ]
  };
}

const transforms = {
  Module: function(node) {
    let body = [
      bluebirdImport()
    ].concat(
      node.imports.map(toJS), node.body.map(toJS)
    );
    const hasMain = node.body.some(function(decl) {
      return decl.getNodeType() === 'FunctionDeclaration' &&
             decl.name === 'main';
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
      } else if (expr.getNodeType() === 'ValueDeclaration') {
        return toJS(expr);
      } else {
        return {
          type: 'ExpressionStatement',
          expression: toJS(expr)
        };
      }
    });

    const decl = {
      type: 'FunctionExpression',
      id: {
        type: 'Identifier',
        name: node.name
      },
      params: node.params.map(function(param) {
        return {
          type: 'Identifier',
          name: param.name
        };
      }),
      expression: false,
      generator: true,
      body: {
        type: 'BlockStatement',
        body: statements
      }
    };
    const outNode = {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: node.name },
          init: {
            type: 'CallExpression',
            callee: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'Promise' },
              property: { type: 'Identifier', name: 'coroutine' }
            },
            arguments: [ decl ]
          }
        }
      ]
    };

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

  ValueDeclaration: function(node) {
    return {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: node.name },
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

  Using: function(node) {
    const importPath = node.path;
    // TODO: don't pollute or at least smart no-conflict identifier
    const naturalIdent = node.path.replace(/.*\/[^/]+$/, '');

    const declarations = [
      {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: naturalIdent },
        init: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'require' },
          arguments: [
            { type: 'Literal', value: importPath }
          ]
        }
      }
    ];

    for (let extraction of node.extractions) {
      declarations.push({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: extraction.name },
        init: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: naturalIdent },
          property: { type: 'Identifier', name: extraction.name }
        }
      });
    }

    return {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: declarations
    };
  },

  Selector: function(node) {
    return { type: 'Identifier', name: node.name };
  },

  MemberAccess: function(node) {
    let mapFn = 'map';
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
        if (node.object.type.resolved().name === 'Promise') {
          mapFn = 'then';
        }
        return {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: toJS(node.object),
            property: { type: 'Identifier', name: mapFn },
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

  UnaryExpression: function(node) {
    const lType = node.argument.type;
    const opPropName = `unary${node.op}`;
    const opProp = lType.getProperty(opPropName);
    const jsMacro = opProp && opProp.resolved().jsMacro;

    if (jsMacro) {
      return jsMacro(node, toJS);
    }

    return {
      type: 'UnaryExpression',
      operator: node.op,
      argument: toJS(node.argument)
    };
  },

  BinaryExpression: function(node) {
    const lType = node.left.type;
    const opPropName = `operator${node.op}`;
    const opProp = lType.getProperty(opPropName);
    const jsMacro = opProp && opProp.resolved().jsMacro;

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

    if (node.callee.getNodeType() === 'Selector' && node.args.length > 0) {
      const name = node.callee.name;
      const obj = node.args[0];
      const prop = obj.type.getProperty(name);
      if (prop) {
        const jsMacro = prop && prop.resolved().jsMacro;
        if (jsMacro) { return jsMacro(node, toJS); }
        const args = node.args.slice(1);
        return {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: toJS(obj),
            property: { type: 'Identifier', name: name }
          },
          arguments: args.map(toJS)
        };
      }
    }
    const jsMacro = node.callee.type && node.callee.type.resolved().jsMacro;
    if (jsMacro) { throw new Error('Not implemented'); }
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
  if (typeof ast.getNodeType !== 'function') {
    console.error('ast', ast);
    throw new Error('Not a valid AST node');
  }
  const transform = transforms[ast.getNodeType()];

  if (transform === undefined) {
    throw new Error(`Unsupported: ${ast.getNodeType()}`);
  }

  return transform(ast);
}

function generateJS(result) {
  result.jsAst = toJS(result.ast);
  return result;
}

module.exports = generateJS;
module.exports.default = generateJS;
