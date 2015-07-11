'use strict';

const NodeTypeVisitor = require('../node-type-visitor');
const TypeVariable = require('../types').TypeVariable;

function resolveTypeHint(node, hint) {
  // TODO: Handle type arguments, e.g. Array<Int32>
  return node.scope.get(hint.name).create();
}

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

      const returnType = new TypeVariable();
      if (node.returnTypeHint) {
        returnType.merge(resolveTypeHint(node, node.returnTypeHint));
      }

      const lastStatement = node.body[node.body.length - 1];
      if (lastStatement) {
        lastStatement.type.merge(returnType);
      }

      const paramTypes = node.params.map(function(param) {
        node.scope.set(param.name, param);
        if (param.typeHint) {
          param.type.merge(resolveTypeHint(node, param.typeHint));
        }
        return param.type;
      });

      node.type.merge(node.scope.get('Function').create(
        [ returnType ].concat(paramTypes)));
    },

    post(node) {
      if (node.name === 'main') {
        const Str = node.scope.get('String'),
              Int32 = node.scope.get('Int32'),
              Arr = node.scope.get('Array'),
              Async = node.scope.get('Async'),
              F = node.scope.get('Function');
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
      const F = node.scope.get('Function');
      const targetFnType = node.fn.type.clone();

      if (targetFnType.type !== node.scope.get('Function')) {
        throw new Error('Cannot call non-function of type ' + targetFnType);
      }

      const callType = F.create(
        [ node.type ].concat(
          node.args.map(function(arg) { return arg.type; })
        )
      );
      callType.merge(targetFnType);
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
