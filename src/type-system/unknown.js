'use strict';

class UnknownType {
  constructor() {
    this.actual = null;
  }

  resolved() {
    if (this.actual !== null) {
      return this.actual.resolved();
    }
    return this;
  }

  toString() {
    return this.actual ? this.actual.toString() : '?';
  }

  equals(other) {
    if (this.actual !== null) {
      return this.actual.equals(other);
    }
    return false;
  }

  merge(other) {
    other = other.resolved();
    const self = this.resolved();
    if (self instanceof UnknownType) {
      self.actual = other;
      return other;
    } else if (other instanceof UnknownType) {
      other.actual = self;
      return self;
    }
    return self.merge(other);
  }
}

module.exports = UnknownType;
module.exports.default = UnknownType;
