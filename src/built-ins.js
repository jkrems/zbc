'use strict';

class BaseType {
  constructor(name, params, id) {
    this.name = name;
    this.params = params || [];
    this.id = id || Symbol(name);
  }

  toString() {
    if (this.params.length) {
      return `${this.name}<${this.params.join(', ')}>`;
    }
    return this.name;
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
      return `${this.name}<${this.args.join(', ')}>`;
    }
    return this.name;
  }
}

function registerBuiltIns(types) {
  types.register('String', []);
  types.register('Array', [ 'ItemType' ]);
  types.register('Void', []);
  types.register('Char', []);
  types.register('Int', []);
  types.register('Float', []);
  types.register('Stream', []);
  types.register('Function');
  return types;
}

module.exports = registerBuiltIns;
module.exports.default = registerBuiltIns;
