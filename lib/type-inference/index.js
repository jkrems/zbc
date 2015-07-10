'use strict';

const NodeTypeVisitor = require('../node-type-visitor');
const TypeVariable = require('../types').TypeVariable;

const visitors = new NodeTypeVisitor({
  StringLiteral: {
    post(node) {
      node.mergeType(node.scope.get('String').create());
    }
  },

  Int32Literal: {
    post(node) {
      node.mergeType(node.scope.get('Int32').create());
    }
  },

  FunctionDeclaration: {
    pre(node) {
      node.scope.parent.set(node.name, node);
    },

    post(node) {
      const paramTypes = node.params.map(function(param) { return param.type; });
      const returnType = new TypeVariable();
      const lastStatement = node.body[node.body.length - 1];
      if (lastStatement) {
        lastStatement.type.merge(returnType);
      }

      const F = node.scope.get('Function');
      node.type.merge(F.create([ returnType ].concat(paramTypes)));

      if (node.name === 'main') {
        const Str = node.scope.get('String'),
              Int32 = node.scope.get('Int32'),
              Arr = node.scope.get('Array'),
              Async = node.scope.get('Async');
        node.type.merge(F.create([
          Async.create([ Int32.create() ]),
          Arr.create([ Str.create() ])
        ]));
      }
    }
  },

  IdentifierReference: {
    post(node) {
      const ref = node.scope.get(node.id);
      node.type.merge(ref.type);
    }
  },

  FunctionCall: {
    post(node) {
      const fn = node.fn;
      if (fn.type.type !== node.scope.get('Function')) {
        console.log('fn.type', fn.type);
        throw new Error('Cannot call non-function of type ' + fn.type);
      }
      const callType = fn.type.clone();
      node.type.merge(callType.args[0]);
    }
  },

  UnaryExpression: {
    post(node) {
      switch (node.op) {
        case '&':
          node.mergeType(
            node.scope.get('Async').create([ node.operand.type ]));
          break;

        default:
          throw new Error(`Unary operator ${node.op} not implemented yet`);
      }
    }
  }
});

function infer(node) {
  node.traverse(visitors);
  return node;
}

module.exports = infer;
infer['default'] = infer;
