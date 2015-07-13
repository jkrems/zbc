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

class TypeVariableFormatter {
  constructor() { this.dict = new Map(); }

  getNext() {
    return '%' + String.fromCharCode(this.dict.size + 97);
  }

  format(v) {
    if (!this.dict.has(v)) {
      this.dict.set(v, this.getNext());
    }
    return this.dict.get(v);
  }
}
exports.TypeVariableFormatter = TypeVariableFormatter;

class PropertySpecView {
  constructor(m) { this.m = m; }

  set(field, typeInstance) {
    if (!this.m.has(field)) {
      throw new Error(`Field not supported: ${field}`);
    }
    typeInstance.merge(this.m.get(field));
  }

  get(field) {
    if (this.m.has(field)) {
      return this.m.get(field);
    }
    throw new Error(`Field not supported: ${field}`);
  }

  has(field) { return this.m.has(field); }

  entries() { return this.m.entries(); }

  toString(varFmt) { return this.m.toString(varFmt); }

  copyAll(other) {
    for (const entry of other.entries()) {
      this.set(entry[0], entry[1]);
    }
  }

  copyClones(other, variables) {
    for (const entry of other.entries()) {
      this.set(entry[0], entry[1].clone(variables));
    }
  }

  get size() { return this.m.size; }
}

class PropertySpec extends PropertySpecView {
  constructor() { super(new Map()); }

  set(field, typeInstance) {
    if (this.m.has(field)) {
      this.m.get(field).merge(typeInstance);
    } else {
      this.m.set(field, typeInstance);
    }
  }

  toString(varFmt) {
    if (this.size === 0) { return ''; }
    varFmt = varFmt || new TypeVariableFormatter();
    const parts = [];
    for (const entry of this.entries()) {
      parts.push(`${entry[0]}:${entry[1].toString(varFmt)}`);
    }
    return `{${parts}}`;
  }
}

class IType {}
exports.IType = IType;

class BaseType extends IType {
  constructor(name, params) {
    super();
    this.id = Symbol(name);
    this.name = name;
    this.params = params && params.map(function(name) {
      return [ name, new TypeVariable() ];
    });
    this.paramByName = this.params ? new Map(this.params) : new Map();
    this.staticFields = new PropertySpec();
    this.fields = new PropertySpec();
  }

  param(name) {
    if (!this.paramByName.has(name)) {
      throw new Error(`Unknown param ${name} for type ${this.name}`);
    }
    return this.paramByName.get(name);
  }

  create(args) {
    return new TypeInstance(this, args);
  }

  format(args, varFmt) {
    if (!args || args.length < 1) {
      return this.name;
    }
    varFmt = varFmt || new TypeVariableFormatter();
    args = args.map(function(arg) { return arg.toString(varFmt); });
    return `${this.name}<${args}>`;
  }
}

class Type extends BaseType {
  constructor(name, params) {
    super(name, params);
    this.type = new BaseType(`Type@${name}`, params);
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

    let varLookup = new Map();
    if (type.params) {
      if (type.params.length !== this.args.length) {
        throw new Error(`${type.name} requires ${type.params.length} arguments`);
      }
      type.params.forEach(function(pair, idx) {
        pair[1].clone(varLookup).merge(args[idx]);
      });
    }

    function cloneFields(fields) {
      const cloned = new PropertySpec();
      for (const entry of fields.entries()) {
        cloned.set(entry[0], entry[1].clone(varLookup));
      }
      return cloned;
    }

    this.staticFields = new PropertySpecView(cloneFields(this.type.staticFields));
    this.fields = new PropertySpecView(cloneFields(this.type.fields));
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

  toString(varFmt) {
    varFmt = varFmt || new TypeVariableFormatter();
    return this.type.format(this.args, varFmt);
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
    this._staticFields = new PropertySpec();
    this._fields = new PropertySpec();
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
    variables = variables || new Map();

    if (!this.actual) {
      if (!variables.has(this)) {
        const copy = new TypeVariable();
        variables.set(this, copy);
        copy.staticFields.copyClones(this._staticFields, variables);
        copy.fields.copyClones(this._fields, variables);
      }
      return variables.get(this);
    }
    return this.actual.clone(variables);
  }

  get fields() {
    return this.actual && this.actual.fields || this._fields;
  }

  get staticFields() {
    return this.actual && this.actual.staticFields || this._staticFields;
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
    if (this.actual) {
      return this.actual.merge(other);
    }

    other.staticFields.copyAll(this._staticFields);
    other.fields.copyAll(this._fields);
    this.actual = other;
  }

  toString(varFmt) {
    varFmt = varFmt || new TypeVariableFormatter();

    if (this.actual) { return this.actual.toString(varFmt); }
    let str = varFmt.format(this);
    if (this.fields.size > 0) {
      str += `.${this.fields.toString(varFmt)}`;
    }
    if (this.staticFields.size > 0) {
      str += `::${this.staticFields.toString(varFmt)}`;
    }
    return str;
  }
}
exports.TypeVariable = TypeVariable;
