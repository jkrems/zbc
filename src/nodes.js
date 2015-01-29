'use strict';

const _ = require('lodash');

const NODE_SPEC = {
  Module: [ 'body' ],
  FunctionDeclaration: [ 'id', 'params', 'body', 'visibility' ],
  Assignment: [ 'target', 'value' ],
  BinaryExpression: [ 'left', 'op', 'right' ],
  UnaryExpression: [ 'op', 'right' ],
  FCallExpression: [ 'callee', 'args' ],
  Literal: [ 'value', 'type' ],
  Interpolation: [ 'elements' ],
  Identifier: [ 'name' ]
};

function Node() {
  this._location = null;
  this.type = null;
}

Node.prototype.getNodeType = function getNodeType() {
  return this._nodeType;
};

Node.prototype.setLocation = function setLocation(location) {
  this._location = location;
  return this;
};

Node.prototype.getLocation = function getLocation() {
  return this._location;
};

Node.prototype.setType = function setType(type) {
  this.type = type;
  return this;
};

Node.prototype.getType = function getType() {
  return this.type;
};

_.each(NODE_SPEC, function(fields, name) {
  exports[name] = function() {
    let idx = 0;
    for (let field of fields) {
      this[field] = arguments[idx++];
    }
  }
  exports[name].prototype = Object.create(Node.prototype, {
    _nodeType: {
      value: name
    }
  });
});
