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
  const Int = types.register('Int', []);
  const Str = types.register('String', [])
    .addProperty('length', Int);
  const Arr = types.register('Array', [ 'ItemType' ])
    .addProperty('length', Int);
  types.register('Void', []);
  types.register('Char', []);
  types.register('Float', []);
  const Stream = types.register('Stream', []);
  const Fn = types.register('Function');

  Int.addProperty('operator+', [ Fn, Int, Int, Int ]);
  Int.addProperty('operator-', [ Fn, Int, Int, Int ]);

  Stream.addProperty('operator<<', [ Fn, Stream, Str, Stream ]);

  Arr.addProperty('unary*', [ Fn, [ Arr, 0 ], 0 ]);
  Arr.addProperty('join', [ Fn, [ Arr, 0 ], Str ]);

  return types;
}

module.exports = registerBuiltIns;
module.exports.default = registerBuiltIns;
