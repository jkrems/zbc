'use strict';
const assert = require('assertive');

const zb = require('../..');

function getNodesAt(ast, idx) {
  const out = [];

  function visit(n) {
    const loc = n.getLocation();
    if (!loc) {
      throw new Error(`Missing location for ${n.getNodeType()}`);
    }
    if (loc.index === idx) {
      out.push(n);
    }
    n.getChildNodes().forEach(visit);
  }

  visit(ast);

  return out;
}

function typed(splitSource) {
  const source = splitSource.join('');
  const expected = [].slice.call(arguments, 1);

  let pos = 0, tokenIdx = 0;
  for (let part of splitSource) {
    pos += part.length;
    if (tokenIdx < expected.length) {
      expected[tokenIdx].pos = pos;
    }
    ++tokenIdx;
  }

  return function() {
    const ast = zb.infer(source);
    const types = ast.types;

    expected.forEach(function(expect) {
      const typeInstance = expect(types);

      const nodes = getNodesAt(ast, expect.pos);
      const nodeTypes = nodes.map(function(n) { return n.type; });
      assert.truthy(
        `${typeInstance} !== ${nodeTypes.join(' | ')}`,
        nodeTypes.some(function(t) {
          return t.equals(typeInstance);
        }));
    });
  };
}
module.exports = typed;

function int(types) {
  return types.get('Int');
}
typed.int = int;

function str(types) {
  return types.get('String');
}
typed.str = str;

function void_(types) {
  return types.get('Void');
}
typed.void_ = void_;

function arr(el) {
  return function arrOf(types) {
    return types.get('Array').createInstance([ el(types) ]);
  };
}
typed.arr = arr;

function fn(args) {
  return function(types) {
    return types.get('Function').createInstance(args.map(function(arg) {
      return arg(types);
    }));
  }
}
typed.fn = fn;
