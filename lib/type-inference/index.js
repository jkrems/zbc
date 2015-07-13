'use strict';

const debug = require('debug')('zbc:type-inference');

const NodeTypeVisitor = require('../node-type-visitor');
const _types = require('../types'),
      TypeVariable = _types.TypeVariable,
      Type = _types.Type;

function resolveTypeHint(node, hint) {
  const args = (hint.args || []).map(function(arg) {
    return resolveTypeHint(node, arg);
  });
  return node.scope.get(hint.name).create(args);
}

const unaryVisitors = {
  '&': function(node) {
    node.mergeType(
      node.scope.get('Async').create([ node.operand.type ]));
  },

  '*': function(node) {
    const Async = node.scope.get('Async');
    const inner = new TypeVariable();
    node.operand.type.merge(Async.create([ inner ]));
    node.mergeType(inner);
  }
};

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

  ArrayLiteral: {
    post(node) {
      const elementType = new TypeVariable();
      const Arr = node.scope.get('Array');
      node.mergeType(Arr.create([ elementType ]));
      node.elements.forEach(function(el) {
        el.mergeType(elementType);
      });
    }
  },

  AssignExpression: {
    post(node) {
      node.scope.set(node.target, node);
      node.type.merge(node.expr.type);
      if (node.typeHint) {
        node.type.merge(resolveTypeHint(node, node.typeHint));
      }
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

  NamespaceDeclaration: {
    post(node) {
      // 1. Create new anonymous type
      const NS = new Type(`Namespace@${node.name}`);
      // 2. Add members as static fields
      node.body.forEach(function(decl) {
        NS.staticFields.set(decl.name, decl.type);
      });
      // 3. Set node to namespace type
      node.mergeType(NS.create());
      // 4. Export to parent scope
      node.scope.parent.set(node.name, node);
    }
  },

  PropertyRead: {
    post(node) {
      node.base.type.fields.set(node.field, node.type);
      debug('%s.%s: %s', node.base.type, node.field, node.type);
    }
  },

  MethodCall: {
    post(node) {
      const F = node.scope.get('Function');
      const argTypes = node.args.map(function(arg) { return arg.type; });
      const callType = F.create([ node.type ].concat(argTypes));
      node.base.type.fields.set(node.field, callType);
      debug('%s.%s: %s', node.base.type, node.field, callType);
    }
  },

  StaticAccess: {
    post(node) {
      node.base.type.staticFields.set(node.field, node.type);
      debug('%s::%s: %s', node.base.type, node.field, node.type);
    }
  },

  IndexAccess: {
    post(node) {
      // Cheating, this should actually be a special case of a binary operator
      const Arr = node.scope.get('Array'),
            Int32 = node.scope.get('Int32');
      const inner = new TypeVariable();
      node.base.type.merge(Arr.create([ inner ]));
      node.index.type.merge(Int32.create());
      node.mergeType(inner);
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
      const unaryVisitor = unaryVisitors[node.op];
      if (!unaryVisitor) {
        throw new Error(`Unary operator ${node.op} not implemented yet`);
      }
      unaryVisitor(node);
    }
  }
});

function infer(node) {
  node.traverse(visitors);
  return node;
}

module.exports = infer;
infer['default'] = infer;
