'use strict';

function first(arr) { return arr[0]; }

class TypeParameter {
  constructor(name, definition) {
    this._name = name;
    this._definition = definition;
  }

  get name() { return this._name; }
  get definition() { return this._definition; }

  static parsePair(pair) {
    if (typeof pair === 'string') { pair = [ pair, undefined ]; }

    const key = pair[0], definition = pair[1];
    return [ key, new TypeParameter(key, definition || new TypeInterface(key)) ];
  }
}

class TypeInterface {
  constructor(name, params) {
    params = (params || []).map(TypeParameter.parsePair);

    this._fields = new Map();
    this._params = new Map(params);
    this._paramOrder = params.map(first);
    this._name = name;
  }

  setField(name, type) {
    if (this._fields.has(name)) {
      throw new Error(`Duplicate definition of ${this._name}.${name}`);
    }
    this._fields.set(name, { type: type, name: name });
  }

  getField(name) {
    if (!this._fields.has(name)) {
      throw new Error(`Unknown field ${this._name}.${name}`);
    }
    return this._fields.get(name);
  }

  getParam(name) {
    if (!this._params.has(name)) {
      throw new Error(`Unknown type parameter ${this._name}.${name}`);
    }
    return this._params.get(name);
  }

  get paramCount() { return this._params.size; }
}

module.exports = TypeInterface;
