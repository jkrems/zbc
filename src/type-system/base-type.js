'use strict';

const UnknownType = require('./unknown');

function prepareArgs(args) {
  if (!args) return undefined;
  if (!Array.isArray(args)) {
    throw new TypeError(`Invalid type args: ${args} (${typeof args}`);
  }
  return args.map(function(arg) {
    return arg;
  });
}

function cloneType(rootType) {
  const unknowns = new Map();

  function _getUnknown(unknown) {
    if (!unknowns.has(unknown)) {
      unknowns.set(unknown, new UnknownType());
    }
    return unknowns.get(unknown);
  }

  function _cloneType(type) {
    type = type.resolved();
    if (type instanceof UnknownType) {
      return _getUnknown(type);
    }
    const args = type.args ? type.args.map(cloneType) : undefined;
    // TODO: handle props
    return new BaseType(type.name, args, type.id, type.props);
  }

  return _cloneType(rootType);
}

class BaseType {
  constructor(name, args, id, props) {
    this.name = name;
    this.args = prepareArgs(args);
    this.id = id || Symbol(name);
    this.props = props || new Map();
  }

  toString() {
    if (this.args === undefined) {
      return `${this.name}<...>`;
    } else if (this.args.length) {
      return `${this.name}<${this.args.join(', ')}>`;
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

  createClone() {
    return cloneType(this);
  }

  createInstance(args) {
    args = args || [];
    if (this.args && args.length !== this.args.length) {
      throw new Error(
        `${this.toString()} expects ${this.args.length}, used with ${args.length} argument(s)`);
    }
    if (args.length === 0 && this.args) {
      return this;
    }

    const clone = this.createClone();
    if (clone.args === undefined) {
      clone.args = args;
    } else {
      clone.args.forEach(function(arg, idx) {
        arg.merge(args[idx]);
      });
    }
    return clone;
  }

  isBasically(other) {
    return (other instanceof BaseType) && (this.id === other.id);
  }

  merge(other) {
    other = other.resolved();
    if (other instanceof UnknownType) {
      return other.merge(this);
    }
    if (!this.isBasically(other)) {
      throw new Error(`Incompatible: ${this} vs. ${other}`);
    }
    if (this.args.length !== other.args.length) {
      throw new Error(`Different arity: ${this} vs ${other}`);
    }
    this.args.forEach(function(arg, idx) {
      arg.merge(other.args[idx]);
    });
    return this;
  }

  equals(other) {
    other = other.resolved();
    return other.id === this.id &&
      other.args.length === this.args.length &&
      this.args.every(function(arg, idx) {
        return arg.equals(other.args[idx]);
      });
  }

  resolved() {
    return this;
  }
}
module.exports = BaseType;
module.exports.default = BaseType;
