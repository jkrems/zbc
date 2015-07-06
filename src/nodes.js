'use strict';

const _ = require('lodash');

const UnknownType = require('./type-system/unknown');

const NODE_SPEC = {
  Module: [ 'imports', 'body' ],
  ExternDeclaration: [ 'id' ],
  TypeHint: [ 'name', 'args' ],
  FunctionDeclaration: [ 'name', 'params', 'body', 'visibility', 'returnHint' ],
  ValueDeclaration: [ 'name', 'typeHint', 'value' ],
  PropertyDeclaration: [ 'name', 'params', 'typeHint' ],
  Assignment: [ 'target', 'value' ],
  Return: [ 'value' ],
  MemberAccess: [ 'object', 'op', 'property' ],
  BinaryExpression: [ 'left', 'op', 'right' ],
  UnaryExpression: [ 'op', 'argument' ],
  Sequence: [ 'first', 'second' ],
  Empty: [],
  FCallExpression: [ 'callee', 'args' ],
  Literal: [ 'value', 'typeName' ],
  Interpolation: [ 'elements' ],
  Using: [ 'path', 'extractions' ],
  InterfaceDeclaration: [ 'name', 'params', 'body' ],
  Selector: [ 'name' ],
  Identifier: [ 'name' ]
};

class Node {
  constructor() {
    this._location = null;
    this._type = new UnknownType();
    this._childNodes = [];
    this._scope = null;
  }

  getChildNodes() {
    return this._childNodes;
  }

  getNodeType() {
    return this._nodeType;
  }

  setLocation(location) {
    this._location = location;
    return this;
  }

  getLocation() {
    return this._location;
  }

  getSourceString() {
    const idx = this._location.index;
    const source = this._location.source;
    const before = source.slice(idx - 5, idx);
    const after = source.slice(idx + 1, idx + 5);
    return `${before}\`${source[idx]}\`${after}`;
  }

  setScope(scope) {
    this._scope = scope;
    return this;
  }

  getScope() {
    return this._scope;
  }

  setType(type) {
    this._type = type;
    return this;
  }

  mergeType(type) {
    return this.getType().merge(type);
  }

  getType() {
    return this._type;
  }

  _addChildIfNode(value) {
    if (value instanceof Node) {
      this._childNodes.push(value);
      if (value.getScope() === null) {
        value.setScope(this.getScope());
      }
    }
  }

  setAttribute(field, value) {
    this[field] = value;
    if (Array.isArray(value)) {
      value.forEach(this._addChildIfNode, this);
    } else {
      this._addChildIfNode(value);
    }
  }
}

_.each(NODE_SPEC, function(fields, name) {
  class __Node extends Node {
    constructor() {
      super();
      let idx = 0;
      for (let field of fields) {
        this.setAttribute(field, arguments[idx++]);
      }
      this._nodeType = name;
    }
  }
  exports[name] = __Node;
});

exports.FunctionDeclaration.prototype.getReturnType =
function getReturnType() {
  const type = this.getType().resolved();
  const lastArg = type.args[type.args.length - 1];
  return lastArg.resolved();
};
