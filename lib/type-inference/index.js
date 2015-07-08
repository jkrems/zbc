'use strict';

const NodeTypeVisitor = require('../node-type-visitor');
const TypeVariable = require('../types').TypeVariable;

const visitors = new NodeTypeVisitor({
  StringLiteral: {
    post(node) {
      node.mergeType(node.scope.get('String').create());
    }
  },

  FunctionDeclaration: {
    post(node) {
      const paramTypes = [];
      const returnType = new TypeVariable();
      const lastStatement = node.body[node.body.length - 1];
      if (lastStatement) {
        lastStatement.type.merge(returnType);
      }

      const fType =
        node.scope.get('Function').create([ returnType ].concat(paramTypes));
      node.type.merge(fType);
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
