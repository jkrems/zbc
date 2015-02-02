'use strict';

const _ = require('lodash');

const UnknownType = require('./type-system/unknown');

const NODE_SPEC = {
  Module: [ 'body', 'types' ],
  ExternDeclaration: [ 'id' ],
  FunctionDeclaration: [ 'id', 'params', 'body', 'visibility' ],
  Assignment: [ 'target', 'value' ],
  Return: [ 'value' ],
  BinaryExpression: [ 'left', 'op', 'right' ],
  UnaryExpression: [ 'op', 'right' ],
  FCallExpression: [ 'callee', 'args' ],
  Literal: [ 'value' ],
  Interpolation: [ 'elements' ],
  Identifier: [ 'name' ]
};

class Node {
  constructor() {
    this._location = null;
    this.type = new UnknownType();
    this.childNodes = [];
  }

  getChildNodes() {
    return this.childNodes;
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

  setType(type) {
    this.type = type;
    return this;
  }

  getType() {
    return this.type;
  }

  addChildIfNode(value) {
    if (value instanceof Node) {
      this.childNodes.push(value);
    }
  }

  setAttribute(field, value) {
    this[field] = value;
    if (Array.isArray(value)) {
      value.forEach(this.addChildIfNode, this);
    } else {
      this.addChildIfNode(value);
    }
  }
}

_.each(NODE_SPEC, function(fields, name) {
  exports[name] = function() {
    Node.call(this);
    let idx = 0;
    for (let field of fields) {
      this.setAttribute(field, arguments[idx++]);
    }
  };
  exports[name].prototype = Object.create(Node.prototype, {
    _nodeType: {
      value: name
    }
  });
});

exports.FunctionDeclaration.prototype.getReturnType =
function getReturnType() {
  const type = this.type.resolved();
  const lastArg = type.args[type.args.length - 1];
  return lastArg.resolved();
};
