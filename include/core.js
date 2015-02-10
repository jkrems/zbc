'use strict';

module.exports =
function coreMacros(types) {
  const Stream = types.get('Stream');
  const streamPush = Stream.getProperty('operator<<').resolved();
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

  const ZBPromise = types.get('Promise');
  const promiseStar = ZBPromise.getProperty('unary*').resolved();
  promiseStar.jsMacro = function(node, toJS) {
    // TODO: turn into await
    return {
      type: 'YieldExpression',
      argument: toJS(node.argument)
    };
  }
}
