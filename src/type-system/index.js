'use strict';

class TypeReference {
  constructor(name, args) {
    this.name = name;
    this.args = args;
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
