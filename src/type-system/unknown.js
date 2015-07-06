'use strict';

class UnknownType {
  constructor() {
    this.actual = null;
    this.props = new Map();
  }

  resolved() {
    if (this.actual !== null) {
      return this.actual.resolved();
    }
    return this;
  }

  toString() {
    const self = this.resolved();
    if (self instanceof UnknownType) {
      return '?';
    }
    return self.toString();
  }

  equals(other) {
    if (this.actual !== null) {
      return this.actual.equals(other);
    }
    return false;
  }

  getProperty(name) {
    if (this.actual !== null) {
      return this.actual.getProperty(name);
    }

    if (this.props.has(name)) {
      return this.props.get(name);
    }
    const prop = new UnknownType();
    this.props.set(name, prop);
    return prop;
  }

  isBasically(other) {
    if (this.actual !== null) {
      return this.actual.isBasically(other.resolved());
    }
    return false;
  }

  createInstance(args) {
    if (this.actual !== null) {
      return this.actual.createInstance(args);
    }
    if (!args || args.length === 0) {
      return this;
    }
    throw new Error(`Can't create instance of unknown type ${this}`);
  }

  setActual(actual) {
    this.actual = actual;
  }

  merge(other) {
    other = other.resolved();
    const self = this.resolved();
    if (other === self) {
      return self;
    }

    if (self instanceof UnknownType) {
      self.setActual(other);
      return other;
    } else if (other instanceof UnknownType) {
      other.setActual(self);
      return self;
    }
    return self.merge(other);
  }
}

module.exports = UnknownType;
module.exports.default = UnknownType;
