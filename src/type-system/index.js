'use strict';

const UnknownType = require('./unknown');
const BaseType = require('./base-type');

class TypeSystem {
  constructor(parent) {
    this._scope = new Map();
    this._ids = new Map();
    this._parent = parent || null;
  }

  createScope() {
    return new TypeSystem(this);
  }

  createUnknown() {
    return new UnknownType(this);
  }

  registerId(id, type) {
    this._ids.set(id, type);
    return type;
  }

  resolveId(id) {
    if (this._ids.has(id)) {
      return this._ids.get(id);
    } else if (this._parent !== null) {
      return this._parent.resolveId(id);
    } else {
      throw new Error(`Unknown identifier: ${id}`);
    }
  }

  register(name, params) {
    let args;
    if (params) {
      const known = new Map();
      args = params.map(function(param) {
        if (known.has(param)) {
          return known.get(param);
        }
        const arg = new UnknownType();
        known.set(param, arg);
        return arg;
      });
    }
    return this.set(name, new BaseType(name, args));
  }

  has(id) {
    return this._scope.has(id) ||
      (this._parent !== null && this._parent.has(id));
  }

  set(id, type) {
    if (this.has(id)) {
      throw new Error(`Redefinition of ${id}`);
    }
    this._scope.set(id, type);
    return type;
  }

  get(id) {
    if (this._scope.has(id)) {
      return this._scope.get(id);
    } else if (this._parent && this._parent.has(id)) {
      return this._parent.get(id);
    }
    throw new Error(`Unknown Type: ${id}`);
  }
}

module.exports = TypeSystem;
module.exports.default = TypeSystem;
