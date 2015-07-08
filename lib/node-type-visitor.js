'use strict';

class NodeTypeVisitor {
  constructor(byNodeType) {
    this._byNodeType = byNodeType;
    this._default = byNodeType._default;
  }

  _accept(phase, node) {
    const visitor = this._byNodeType[node.nodeType];
    if (visitor && visitor[phase]) {
      return visitor[phase](node);
    } else if (this._default && this._default[phase]) {
      return this._default[phase](node);
    }
  }

  pre(node) { return this._accept('pre', node); }
  post(node) { return this._accept('post', node); }
}

function createPhaseMap(phase, map) {
  return Object.keys(map).reduce(function(out, key) {
    out[key] = {};
    out[key][phase] = map[key];
    return out;
  }, {});
}

class NodeTypePreVisitor extends NodeTypeVisitor {
  constructor(byNodeType) {
    super(createPhaseMap('pre', byNodeType));
  }
}

class NodeTypePostVisitor extends NodeTypeVisitor {
  constructor(byNodeType) {
    super(createPhaseMap('post', byNodeType));
  }
}

module.exports = NodeTypeVisitor;
NodeTypeVisitor['default'] = NodeTypeVisitor;
NodeTypeVisitor.Pre = NodeTypePreVisitor;
NodeTypeVisitor.Post = NodeTypePostVisitor;
