'use strict';

function checkType(t, node, expected) {
  if (node.type.isA(expected)) {
    t.pass(`Expected ${expected}, found ${node.type}`);
  } else {
    t.fail(`Expected ${expected}, found ${node.type}`);
  }
}
exports.checkType = checkType;
