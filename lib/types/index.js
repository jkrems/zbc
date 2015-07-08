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
    const actual = other.getActual();
    if (!(actual instanceof TypeInstance)) {
      throw new Error('Cannot test against unresolved types');
    }

    if (this.type !== actual.type || this.args.length !== actual.args.length) {
      return false;
    }

    this.args.every(function(arg, idx) {
      return arg.isA(actual.args[idx]);
    }, this);

    return true;
  }

  getActual() { return this; }

  toString() {
    return this.type.format(this.args);
  }

  merge(other) {
    other = other.getActual();
    if (other instanceof TypeVariable) {
      other.merge(this);
      return;
    }
    throw new Error('Merge of `TypeInstance`s not implemented yet');
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

  merge(other) {
    return this.actual ? this.actual.merge(other) : (this.actual = other);
  }

  toString() {
    return this.actual ? this.actual.toString() : '?';
  }
}
exports.TypeVariable = TypeVariable;
