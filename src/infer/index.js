'use strict';

const TypeSystem = require('../type-system');

function walkTree(node, visitors) {
  visitors.forEach(function(visitor) {
    if (typeof visitor.enter === 'function' && visitor.accept(node)) {
      visitor.enter(node);
    }
  });

  const children = node.getChildNodes();
  children.forEach(function(child) {
    walkTree(child, visitors);
  });

  visitors.forEach(function(visitor) {
    if (typeof visitor.leave === 'function' && visitor.accept(node)) {
      visitor.leave(node);
    }
  });

  return node;
}

function makeTypeVisitor(nodeType, leave, enter) {
  return {
    accept: function(node) {
      return node.getNodeType() === nodeType;
    },
    leave: leave,
    enter: enter
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

const sequenceToSecond = makeTypeVisitor(
  'Sequence', function sequenceToSecond(node) {
    node.type.merge(node.second.type);
  });

function inferVisitors(types, loadModule) {
  const typesStack = [];
  function pushTypeScope() {
    typesStack.push(types);
    types = types.createScope();
  }
  function popTypeScope() {
    types = typesStack.pop();
  }

  const imports = makeTypeVisitor(
    'Using', function imports(node) {
      // TODO: evaluate in new scope based on root type scope
      // then set the types of the extractions (and of this)
      const rootScope = types.getRootScope();
      const moduleScope = loadModule(node.path, rootScope).types;

      const ns = moduleScope.toNamespace(node.path);
      node.type.merge(ns);

      for (let extraction of node.extractions) {
        const propType = ns.getProperty(extraction.name);
        if (propType === undefined) {
          throw new Error(`${node.path} does not export ${extraction.name}`);
        }
        extraction.type.merge(propType);
      }
    });

  const mergeReturnTypes = makeTypeVisitor(
    'FunctionDeclaration', function mergeReturnTypes(node) {
      if (node.body === null) return;

      const retType = node.getReturnType();
      node.body.type.merge(retType);
    });

  function resolveHint(hint) {
    if (hint === null) { return types.createUnknown(); }
    const args = hint.args.map(resolveHint);
    return types.get(hint.name).createInstance(args);
  }

  const literals = makeTypeVisitor(
    'Literal', function literals(node) {
      node.type.merge(types.get(node.typeName));
    });

  const emptyVoid = makeTypeVisitor(
    'Empty', function emptyVoid(node) {
      node.type.merge(types.get('Void'));
    });

  const registerInterfaces = makeTypeVisitor(
    'InterfaceDeclaration',
    function leaveInterface() {
      popTypeScope();
    }, function enterInterface(node) {
      const knownParams = new Map();
      const typeParams = node.params.map(function(param) {
        if (knownParams.has(param)) {
          return knownParams.get(param);
        }
        const paramType = types.createUnknown();
        types.set(param, paramType);
        knownParams.set(param, paramType);
        return paramType;
      });
      const t = types.register(node.name, typeParams);
      pushTypeScope();
      types.set('%self', t);
    });

  const registerIdentifiers = makeTypeVisitor(
    'ValueDeclaration', function registerIdentifiers(node) {
      types.registerId(node.name, node.type);
      node.type.merge(resolveHint(node.typeHint));
      if (node.value !== null) {
        node.type.merge(node.value.type);
      }
    });

  const resolveIdentifiers = makeTypeVisitor(
    'Identifier', function resolveIdentifiers(node) {
      node.type.merge(types.resolveId(node.name));
    });

  const functionTypes = makeTypeVisitor(
    'FunctionDeclaration', function functionTypes(node) {
      types.registerId(node.name, node.type);

      const paramTypes = node.params.map(function(param) {
        return param.type;
      });
      const returnType = resolveHint(node.returnHint);
      const fnType = types.get('Function')
        .createInstance(paramTypes.concat([ returnType ]));
      node.type.merge(fnType);
    });

  const mainSignature = makeTypeVisitor(
    'FunctionDeclaration', function mainSignature(node) {
      if (node.name !== 'main') { return; }
      // main(argv: Array<String>): Int
      const str = types.get('String').createInstance();
      const int = types.get('Int').createInstance();
      const strArr = types.get('Array').createInstance([ str ]);
      const mainFn = types.get('Function').createInstance([ strArr, int ]);
      node.type.merge(mainFn);
    });

  const addProperties = makeTypeVisitor(
    'PropertyDeclaration', function addProperties(node) {
      const selfType = types.get('%self').resolved();
      const returnType = resolveHint(node.typeHint);
      let propType;
      if (node.params === null) {
        propType = returnType;
      } else {
        const paramTypes = [
          types.get('%self')
        ].concat(node.params.map(function(param) {
          return param.type;
        }));
        propType = types.get('Function')
          .createInstance(paramTypes.concat(returnType));
      }
      node.type.merge(propType);
      selfType.addProperty(node.name, node.type);
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

      objType.merge(binaryType.args[0]);
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
      const objType = node.op === '->' ?
        derefType(node.object) : node.object.type.resolved();
      const selector = node.property;
      const propName = selector.name;
      const propType = objType.getProperty(propName);
      if (propType === undefined) {
        throw new Error(`${objType} has no property ${propName}`);
      }
      selector.type.merge(propType);

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
      let callee = node.callee;
      let args = node.args;
      let calleeType;
      if (callee.getNodeType() === 'Selector' && args.length > 0) {
        const obj = args[0];
        const prop = obj.type.getProperty(callee.name);
        if (prop) {
          calleeType = prop.resolved();
        }
      } else {
        calleeType = callee.type.resolved();
      }

      const callType = types.get('Function')
        .createInstance(args.map(function(arg) {
          return arg.type;
        }).concat([ node.type ]));

      callType.merge(calleeType);

      const retType = callType.args.slice(-1)[0];
      node.type.merge(retType);
    });

  return [
    imports,
    literals,
    emptyVoid,
    sequenceToSecond,
    registerInterfaces,
    addProperties,
    resolveIdentifiers,
    registerIdentifiers,
    functionTypes,
    bubbleReturn,
    bubbleAssign,
    binary,
    fcall,
    memberAccess,
    mergeReturnTypes,
    mainSignature
  ];
}

function infer(ast, types, loadModule) {
  const visitors = inferVisitors(types, loadModule);
  return { ast: walkTree(ast, visitors), types: types };
}
module.exports = infer;
module.exports.default = infer;
