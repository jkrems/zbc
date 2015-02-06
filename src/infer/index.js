'use strict';

function walkTree(node, visitors) {
  const children = node.getChildNodes();
  children.forEach(function(child) {
    walkTree(child, visitors);
  });
  visitors.forEach(function(visitor) {
    if (visitor.accept(node)) {
      visitor.visit(node);
    }
  });
  return node;
}

function makeTypeVisitor(nodeType, visit) {
  return {
    accept: function(node) {
      return node.getNodeType(nodeType) === nodeType;
    },
    visit: visit
  };
}

const bubbleAssign = makeTypeVisitor(
  'Assignment', function bubbleAssign(node) {
    const idType = node.type.merge(node.value.type);
    // TODO: store idType in scope..?
    node.target.type.merge(node.type);
  });

const bubbleReturn = makeTypeVisitor(
  'Return', function bubbleReturn(node) {
    node.type.merge(node.value.type);
  });

const mergeReturnTypes = makeTypeVisitor(
  'FunctionDeclaration', function mergeReturnTypes(node) {
    const retType = node.type.args[node.type.args.length - 1];
    walkTree(node, [ // TODO: prevent descend into lambdas
      makeTypeVisitor('Return', function(returnNode) {
        returnNode.type.merge(retType);
      })
    ]);
  });

function inferVisitors(types) {
  const mainSignature = makeTypeVisitor(
    'FunctionDeclaration', function mainSignature(node) {
      if (node.id.name !== 'main') { return; }
      // main(argv: Array<String>): Int
      const str = types.get('String').createInstance();
      const int = types.get('Int').createInstance();
      const strArr = types.get('Array').createInstance([ str ]);
      const mainFn = types.get('Function').createInstance([ strArr, int ]);
      node.type.merge(mainFn);
    });

  const binary = makeTypeVisitor(
    'BinaryExpression', function binary(node) {
      const objType = node.left.type.resolved();
      const propName = `operator${node.op}`;
      const prop = objType.getProperty(propName);

      const binaryType = types.get('Function')
        .createInstance([
          types.createUnknown(),
          types.createUnknown(),
          types.createUnknown()
        ]);
      binaryType.merge(prop);

      node.left.type.merge(binaryType.args[0]);
      node.right.type.merge(binaryType.args[1]);
      node.type.merge(binaryType.args[2]);
    });

  function derefType(node) {
    const propName = 'unary*';
    const objType = node.type.resolved();
    const prop = objType.getProperty(propName);
    const unaryType = types.get('Function')
      .createInstance([ types.createUnknown(), types.createUnknown() ]);
    unaryType.merge(prop);
    return unaryType.args[1].resolved();
  }

  const memberAccess = makeTypeVisitor(
    'MemberAccess', function memberAccess(node) {
      let objType;
      if (node.op === '->') {
        objType = derefType(node.object);
      } else {
        objType = node.object.type.resolved();
      }
      const propName = node.property.name;
      const propType = objType.getProperty(propName);

      let resultType;
      if (node.op === '->') {
        resultType = node.object.type.createInstance([ propType ]);
      } else {
        resultType = propType;
      }
      node.type.merge(resultType);
    });

  const fcall = makeTypeVisitor(
    'FCallExpression', function fcall(node) {
      // TODO: handle `this`/method
      // TODO: build generic function and merge
      // TODO: check arguments

      const fnType = node.callee.type.resolved();

      const typeArgs = fnType.args;
      const retType = typeArgs.slice(-1)[0];
      node.type.merge(retType);
    });

  return [
    bubbleAssign,
    bubbleReturn,
    binary,
    fcall,
    memberAccess,
    mergeReturnTypes,
    mainSignature
  ];
}

function infer(ast) {
  return walkTree(ast, inferVisitors(ast.types));
}
module.exports = infer;
module.exports.default = infer;
