'use strict';

// Async<'T> := Type('Async', [ TypeParam('T') ])
// Async<?> := TypeInstance(Async<T>, [ TypeVariable() ])
// Async<String> := TypeInstance(Async<T>, [ TypeInstance(Type('String')) ])

// * Type: A declared type; e.g. the `X` in `typedef int X;`
// * TypeParam: A placeholder in a Type declaration, e.g.:
//   ```
//   interface Visitor<N> {
//     visit(node: N);
//   }
//   ```
// * TypeInstance: A Type used on something else, e.g. `f(x: X) {}` or `List<X>`
// * TypeVariable: A placeholder for a TypeInstance
//
// The latter two are both `ITypeInstance`, the former are both `IType`.
// The `.type` of a node should always refer to an `ITypeInstance`.
// It's possible to create an instance of an `IType` by calling
// `.create(...args)`.
// Types can have a variable number of parameters, e.g. the Function type.
// All AST nodes start out with a new `TypeVariable` as their `type`.

class IncompatibleTypeError extends Error {
  constructor(typeA, typeB) {
    super(`${typeA} is not compatible with ${typeB}`);
    this.name = 'IncompatibleTypeError';
  }
}

class IType {}
exports.IType = IType;

class Type extends IType {
  constructor(name, params) {
    super();
    this.id = Symbol(name);
    this.name = name;
    this.params = params;
  }

  create(args) {
    return new TypeInstance(this, args);
  }

  format(args) {
    if (!args || args.length < 1) {
      return this.name;
    }
    return `${this.name}<${args}>`;
  }
}
exports.Type = Type;

class ITypeInstance {}
exports.ITypeInstance = ITypeInstance;

class TypeInstance extends ITypeInstance {
  constructor(type, args) {
    super();
    this.type = type;
    this.args = args || [];
  }

  isA(other) {
    other = other.getActual();
    if (!(other instanceof TypeInstance)) {
      throw new Error('Cannot test against unresolved types');
    }

    if (this.type !== other.type || this.args.length !== other.args.length) {
      return false;
    }

    return this.args.every(function(arg, idx) {
      return arg.isA(other.args[idx]);
    }, this);
  }

  clone(variables) {
    // Create a new type that has independent type variables;
    // E.g. Function<T, T, Int32> -> Function<V, V, Int32>
    variables = variables || new Map();

    function processElement(arg) {
      return arg.clone(variables);
    }

    return this.type.create(this.args.map(processElement));
  }

  getActual() { return this; }

  toString() {
    return this.type.format(this.args);
  }

  isResolved() { return true; }

  merge(other) {
    other = other.getActual();
    if (other instanceof TypeVariable) {
      return other.merge(this);
    }

    if (this.type !== other.type || this.args.length !== other.args.length) {
      throw new IncompatibleTypeError(this, other);
    }

    try {
      this.args.forEach(function(arg, idx) {
        arg.merge(other.args[idx]);
      }, this);
    } catch (err) {
      if (err instanceof IncompatibleTypeError) {
        throw new IncompatibleTypeError(this, other);
      } else {
        throw err;
      }
    }
  }
}
exports.TypeInstance = TypeInstance;

class TypeVariable extends ITypeInstance {
  constructor() {
    super();
    this.actual = null;
  }

  isA(other) {
    return this.actual ? this.actual.isA(other) : false;
  }

  getActual() {
    return this.actual ? this.actual.getActual() : this;
  }

  isResolved() {
    return this.actual && this.actual.isResolved();
  }

  clone(variables) {
    if (!this.actual) {
      if (!variables.has(this)) {
        variables.set(this, new TypeVariable());
      }
      return variables.get(this);
    }
    return this.actual.clone(variables);
  }

  get args() {
    if (!this.actual) {
      throw new Error('Cannot get args of unresolved type');
    }
    return this.actual.args;
  }

  get type() {
    if (!this.actual) {
      throw new Error('Cannot get type of unresolved type');
    }
    return this.actual.type;
  }

  merge(other) {
    return this.actual ? this.actual.merge(other) : (this.actual = other);
  }

  toString() {
    return this.actual ? this.actual.toString() : '?';
  }
}
exports.TypeVariable = TypeVariable;
