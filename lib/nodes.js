'use strict';

class AstNode {
  constructor(fields, args) {
    this._nodeType = this.constructor.name;
    this._childNodes = [];
    this._scope = null;

    if (args.length !== fields.length) {
      throw new Error(`${this._nodeType} expects ${fields.length} arguments`);
    }

    let idx = 0;
    for (const field of fields) {
      this.setAttribute(field, args[idx++]);
    }
  }

  getScope() {
    return this._scope;
  }

  setScope(scope) {
    this._scope = scope;
    return this;
  }

  _addChildIfNode(value) {
    if (value instanceof AstNode) {
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

register(class Module extends AstNode {
  constructor() {
    super([ 'imports', 'body' ], arguments);
  }
});

register(class FunctionDeclaration extends AstNode {
  constructor() {
    super([ 'name', 'params', 'body' ], arguments);
  }
});

register(class Parameter extends AstNode {
  constructor() { super([ 'name' ], arguments); }
});

register(class StringLiteral extends AstNode {
  constructor() { super([ 'textTokens', 'expressions' ], arguments); }
});

register(class UnaryExpression extends AstNode {
  constructor() { super([ 'op', 'operand' ], arguments); }
});

function register(nodeClass) {
  const name = nodeClass.prototype.constructor.name;
  exports[name] = nodeClass;
}
