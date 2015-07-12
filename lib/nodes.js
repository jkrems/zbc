'use strict';

const assert = require('assert');

const TypeVariable = require('./types').TypeVariable;

class AstNode {
  constructor(fields, args) {
    this.nodeType = this.constructor.name;
    this.childNodes = [];
    this.parent = null;
    this.scope = null;
    this.type = new TypeVariable();

    if (args.length !== fields.length) {
      throw new Error(`${this.nodeType} expects ${fields.length} arguments`);
    }

    let idx = 0;
    for (const field of fields) {
      this.setAttribute(field, args[idx++]);
    }
  }

  mergeType(type) {
    this.type.merge(type);
  }

  traverse(visitor) {
    if (visitor && visitor.pre) { visitor.pre(this); }
    for (const child of this.childNodes) {
      child.traverse(visitor);
    }
    if (visitor && visitor.post) { visitor.post(this); }
  }

  _addChildIfNode(value) {
    if (value instanceof AstNode) {
      this.childNodes.push(value);
      value.parent = this;
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
    super([ 'name', 'params', 'body', 'returnTypeHint' ], arguments);
  }

  getReturnType() {
    return this.type.getActual().args[0].getActual();
  }

  getParamTypes() {
    return this.type.getActual().args.slice(1);
  }
});

register(class Parameter extends AstNode {
  constructor() { super([ 'name', 'typeHint' ], arguments); }
});

register(class FunctionCall extends AstNode {
  constructor() { super([ 'fn', 'args' ], arguments); }
});

register(class StringLiteral extends AstNode {
  constructor() { super([ 'textTokens', 'expressions' ], arguments); }
});

register(class Int32Literal extends AstNode {
  constructor(value) {
    super([ 'value' ], [ value ]);
    assert(Number.isInteger(value),
      'Int32Literal#value has to be an integer, got ' + value);
  }
});

register(class UnaryExpression extends AstNode {
  constructor() { super([ 'op', 'operand' ], arguments); }
});

register(class IdentifierReference extends AstNode {
  constructor() { super([ 'id' ], arguments); }
});

register(class AssignExpression extends AstNode {
  constructor() { super([ 'target', 'typeHint', 'expr' ], arguments); }
});

register(class NamespaceDeclaration extends AstNode {
  constructor() { super([ 'name', 'body' ], arguments); }
});

register(class StaticAccess extends AstNode {
  constructor() { super([ 'base', 'field' ], arguments); }
});

register(class IndexAccess extends AstNode {
  constructor() { super([ 'base', 'index' ], arguments); }
});

register(class ArrayLiteral extends AstNode {
  constructor() { super([ 'elements' ], arguments); }
});

function register(nodeClass) {
  const name = nodeClass.prototype.constructor.name;
  exports[name] = nodeClass;
}
