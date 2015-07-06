'use strict';

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
    /* const idType = */ node.mergeType(node.value.getType());
    // TODO: store idType in scope..?
    node.target.mergeType(node.getType());
  });

const bubbleReturn = makeTypeVisitor(
  'Return', function bubbleReturn(node) {
    node.mergeType(node.value.getType());
  });

const sequenceToSecond = makeTypeVisitor(
  'Sequence', function sequenceToSecond(node) {
    node.mergeType(node.second.getType());
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
      node.mergeType(ns);

      for (let extraction of node.extractions) {
        const propType = ns.getProperty(extraction.name);
        if (propType === undefined) {
          throw new Error(`${node.path} does not export ${extraction.name}`);
        }
        extraction.mergeType(propType);
      }
    });

  const mergeReturnTypes = makeTypeVisitor(
    'FunctionDeclaration', function mergeReturnTypes(node) {
      if (node.body === null) {
        return;
      }

      const retType = node.getReturnType();
      node.body.mergeType(retType);
    });

  function resolveHint(hint) {
    if (hint === null) { return types.createUnknown(); }
    const args = hint.args.map(resolveHint);
    return types.get(hint.name).createInstance(args);
  }

  const literals = makeTypeVisitor(
    'Literal', function literals(node) {
      node.mergeType(types.get(node.typeName));
    });

  const emptyVoid = makeTypeVisitor(
    'Empty', function emptyVoid(node) {
      node.mergeType(types.get('Void'));
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
      types.registerId(node.name, node.getType());
      node.mergeType(resolveHint(node.typeHint));
      if (node.value !== null) {
        node.mergeType(node.value.getType());
      }
    });

  const resolveIdentifiers = makeTypeVisitor(
    'Identifier', function resolveIdentifiers(node) {
      node.mergeType(types.resolveId(node.name));
    });

  const functionTypes = makeTypeVisitor(
    'FunctionDeclaration', function functionTypes(node) {
      types.registerId(node.name, node.getType());

      const paramTypes = node.params.map(function(param) {
        return param.getType();
      });
      const returnType = resolveHint(node.returnHint);
      const fnType = types.get('Function')
        .createInstance(paramTypes.concat([ returnType ]));
      node.mergeType(fnType);
    });

  const mainSignature = makeTypeVisitor(
    'FunctionDeclaration', function mainSignature(node) {
      if (node.name !== 'main') { return; }
      // main(argv: Array<String>): Int
      const str = types.get('String').createInstance();
      const int = types.get('Int').createInstance();
      const strArr = types.get('Array').createInstance([ str ]);
      const mainFn = types.get('Function').createInstance([ strArr, int ]);
      node.mergeType(mainFn);
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
          return param.getType();
        }));
        propType = types.get('Function')
          .createInstance(paramTypes.concat(returnType));
      }
      node.mergeType(propType);
      selfType.addProperty(node.name, node.getType());
    });

  const binary = makeTypeVisitor(
    'BinaryExpression', function binary(node) {
      const objType = node.left.getType().resolved();
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
      node.right.mergeType(binaryType.args[1]);
      node.mergeType(binaryType.args[2]);
    });

  function derefType(node) {
    const propName = 'unary*';
    const objType = node.getType().resolved();
    const prop = objType.getProperty(propName);
    const unaryType = types.get('Function')
      .createInstance([ types.createUnknown(), types.createUnknown() ]);
    unaryType.merge(prop);
    return unaryType.args[1].resolved();
  }

  const memberAccess = makeTypeVisitor(
    'MemberAccess', function memberAccess(node) {
      const objType = node.op === '->' ?
        derefType(node.object) : node.object.getType().resolved();
      const selector = node.property;
      const propName = selector.name;
      const propType = objType.getProperty(propName);
      if (propType === undefined) {
        throw new Error(`${objType} has no property ${propName}`);
      }
      selector.mergeType(propType);

      let resultType;
      if (node.op === '->') {
        resultType = node.object.getType().createInstance([ propType ]);
      } else {
        resultType = propType;
      }
      node.mergeType(resultType);
    });

  const fcall = makeTypeVisitor(
    'FCallExpression', function fcall(node) {
      let callee = node.callee;
      let args = node.args;
      let calleeType;
      if (callee.getNodeType() === 'Selector' && args.length > 0) {
        const obj = args[0];
        const prop = obj.getType().getProperty(callee.name);
        if (prop) {
          calleeType = prop.resolved();
        }
      } else {
        calleeType = callee.getType().resolved();
      }

      const callType = types.get('Function')
        .createInstance(args.map(function(arg) {
          return arg.getType();
        }).concat([ node.getType() ]));

      callType.merge(calleeType);

      const retType = callType.args.slice(-1)[0];
      node.mergeType(retType);
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
