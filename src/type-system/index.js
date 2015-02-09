'use strict';

const UnknownType = require('./unknown');
const BaseType = require('./base-type');

class TypeSystem {
  constructor(parent) {
    this._scope = new Map();
    this._ids = new Map();
    this._parent = parent || null;
  }

  getRootScope() {
    return this._parent === null ? this : this._parent.getRootScope();
  }

  toNamespace(name) {
    const ns = new BaseType(name, []);
    for (let id of this._ids.keys()) {
      ns.addProperty(id, this.resolveId(id));
    }
    return ns;
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

  register(name, args) {
    return this.set(name, new BaseType(name, args));
  }

  getKnownTypes() {
    const known = [];
    for (let key of this._scope.keys()) {
      known.push(key);
    }
    return known.concat(
      this._parent !== null ? this._parent.getKnownTypes() : []
    );
  }

  has(id) {
    return this._scope.has(id) ||
      (this._parent !== null && this._parent.has(id));
  }

  set(id, type) {
    if (this._scope.has(id)) {
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
