'use strict';

module.exports =
function httpMacros(types) {
  if (types.has('HttpServer')) {
    const HttpServer = types.get('HttpServer');
    const serverListen = HttpServer.getProperty('listen').resolved();
    serverListen.jsMacro = function(node, toJS) {
      console.log(node);
      const selfArg = toJS(node.args[0]);
      const portArg = toJS(node.args[1]);
      return {
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
              body: [
                {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'CallExpression',
                    callee: {
                      type: 'MemberExpression',
                      object: selfArg,
                      property: { type: 'Identifier', name: 'listen' },
                      computed: false
                    },
                    arguments: [
                      portArg,
                      {
                        type: 'FunctionExpression',
                        params: [],
                        expression: false,
                        body: {
                          type: 'BlockStatement',
                          body: [
                            {
                              type: 'ExpressionStatement',
                              expression: {
                                type: 'CallExpression',
                                callee: { type: 'Identifier', name: 'resolve' },
                                arguments: [
                                  {
                                    type: 'CallExpression',
                                    callee: {
                                      type: 'MemberExpression',
                                      object: { type: 'ThisExpression' },
                                      property: { type: 'Identifier', name: 'address' }
                                    },
                                    arguments: []
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      };
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
};
