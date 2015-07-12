'use strict';

const NodeTypeVisitor = require('../node-type-visitor');

class Scope {
  constructor(parent) {
    this._parent = parent || null;
    this._known = new Map();
  }

  get(id) {
    if (this._known.has(id)) {
      return this._known.get(id);
    } else if (this._parent) {
      return this._parent.get(id);
    } else {
      throw new Error(`Symbol not found: ${id.toString()}`);
    }
  }

  set(id, value) {
    this._known.set(id, value);
  }

  get parent() { return this._parent; }

  getRoot() {
    return this._parent ? this._parent.getRoot() : this;
  }
}

function setDefaultScope(moduleScope) {
  return new NodeTypeVisitor.Pre({
    Module(node) { node.scope = moduleScope; },

    FunctionDeclaration(node) {
      node.scope = new Scope(node.parent.scope);
      node.scope.set(node.name, node);
    },

    NamespaceDeclaration(node) {
      node.scope = new Scope(node.parent.scope);
    },

    _default(node) { node.scope = node.parent.scope; }
  });
}

function trackScopes(ast) {
  const rootScope = new Scope();
  ast.traverse(setDefaultScope(new Scope(rootScope)));
  return ast;
}

module.exports = trackScopes;
trackScopes['default'] = trackScopes;
