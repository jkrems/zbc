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

class Node {
  constructor() {
    this._location = null;
    this.type = null;
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
}

_.each(NODE_SPEC, function(fields, name) {
  exports[name] = function() {
    Node.call(this);
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
