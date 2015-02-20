'use strict';

class Scope {
  constructor(kind, parent) {
    this._kind = kind;
    this._parent = parent;
    this._ids = new Map();
  }
}

// Scope kinds
const SCOPE_KINDS = [
  Scope.GLOBAL = Symbol(),
  Scope.MODULE = Symbol(),
  Scope.FUNCTION = Symbol(),
  Scope.BLOCK = Symbol()
];

module.exports = Scope;
module.exports.default = Scope;
