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

const inferVisitors = [
  bubbleAssign,
  bubbleReturn,
  mergeReturnTypes
];

function infer(ast) {
  return walkTree(ast, inferVisitors);
}
module.exports = infer;
module.exports.default = infer;
