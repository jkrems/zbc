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
  'Assignment', function(node) {
    const idType = node.type.merge(node.value.type);
    // TODO: store idType in scope..?
    node.target.type.merge(node.type);
  });

const bubbleReturn = makeTypeVisitor(
  'Return', function(node) {
    node.type.merge(node.value.type);
  });

const mergeReturnTypes = makeTypeVisitor(
  'FunctionDeclaration', function(node) {
    const retType = node.type.args[node.type.args.length - 1];
    walkTree(node, [ // TODO: prevent descend into lambdas
      makeTypeVisitor('Return', function(returnNode) {
        returnNode.type.merge(retType);
      })
    ]);
  });

function inferVisitors(types) {
  const mainSignature = makeTypeVisitor(
    'FunctionDeclaration', function(node) {
      if (node.id.name !== 'main') { return; }
      // main(argv: Array<String>): Int
      const str = types.get('String').createInstance();
      const int = types.get('Int').createInstance();
      const strArr = types.get('Array').createInstance([ str ]);
      const mainFn = types.get('Function').createInstance([ strArr, int ]);
      node.type.merge(mainFn);
    });

  return [
    bubbleAssign,
    bubbleReturn,
    mergeReturnTypes,
    mainSignature
  ];
}

function infer(ast) {
  return walkTree(ast, inferVisitors(ast.types));
}
module.exports = infer;
module.exports.default = infer;
