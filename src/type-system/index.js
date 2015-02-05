'use strict';

const UnknownType = require('./unknown');

class BaseType {
  constructor(name, params, id) {
    this.name = name;
    this.params = params || undefined;
    this.id = id || Symbol(name);
    this.props = new Map();
  }

  toString() {
    if (this.params === undefined) {
      return `${this.name}<...>`;
    } else if (this.params.length) {
      return `${this.name}<${this.params.join(', ')}>`;
    }
    return this.name;
  }

  addProperty(name, spec) {
    this.props.set(name, spec);
    return this;
  }

  getProperty(name) {
    return this.props.get(name);
  }

  createInstance(args) {
    args = args || [];
    if (this.params && args.length !== this.params.length) {
      throw new Error(
        `${this.toString()} expects ${this.params.length}, used with ${args.length} argument(s)`);
    }
    return new TypeInstance(this, args);
  }
}

class TypeInstance {
  constructor(type, args) {
    this.type = type;
    this.args = args;
  }

  toString() {
    if (this.args.length) {
      return `${this.type.name}<${this.args.join(', ')}>`;
    }
    return this.type.name;
  }

  resolved() {
    return this;
  }

  equals(other) {
    other = other.resolved();
    return other.type === this.type &&
      other.args.length === this.args.length &&
      this.args.every(function(arg, idx) {
        return arg.equals(other.args[idx]);
      });
  }

  getProperty(name) {
    if (!this.type.props.has(name)) {
      throw new Error(`Unknown property ${name} of ${this}`);
    }
    const propSpec = this.type.props.get(name);
    const self = this;

    function instantiate(spec) {
      if (Array.isArray(spec)) {
        const t = spec[0];
        const args = spec.slice(1).map(instantiate);
        return t.createInstance(args);
      } else if (typeof spec === 'number') {
        return self.args[spec];
      } else if (spec instanceof BaseType) {
        return spec.createInstance();
      }
    }

    return instantiate(propSpec);

    const args = propSpec.args.map(function(arg) {
      if (arg instanceof BaseType) {
        return arg.createInstance(); // TODO: handle deeper types
      } else if (typeof arg === 'number') {
        return this.args[arg];
      }
      return arg;
    }, this);
    return propSpec.type.createInstance(args);
  }

  merge(other) {
    other = other.resolved();
    if (other instanceof UnknownType) {
      return other.merge(this);
    }
    if (this.type !== other.type) {
      throw new Error(`Incompatible: ${this} vs. ${other}`);
    }
    this.args.forEach(function(arg, idx) {
      arg.merge(other.args[idx]);
    });
    return this;
  }
}

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
    return this.set(name, new BaseType(name, params));
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
