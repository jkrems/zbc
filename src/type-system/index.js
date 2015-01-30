'use strict';

class TypeReference {
  constructor(name, args) {
    this.name = name;
    this.args = args;
  }

  toString() {
    if (this.args.length) {
      return `${this.name}<${this.args.join(', ')}>`;
    }
    return this.name;
  }
}

class UnknownType {
  constructor() {
  }
}

class TypeSystem {
  constructor() {
  }

  createReference(name, args) {
    return new TypeReference(name, args);
  }

  createUnknown() {
    return new UnknownType();
  }
}

module.exports = TypeSystem;
module.exports.default = TypeSystem;
