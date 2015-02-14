'use strict';

class Position {
  constructor(source, index) {
    this.source = source;
    this.index = index;
  }

  toString() {
    const snippet = this.source.slice(this.index - 5, this.index + 5);
    return '' + this.index + ':{' + JSON.stringify(snippet) + '}';
  }

  add(b) {
    return new Position(this.source, Math.min(this.index, b.index));
  }
}

module.exports = Position;
module.exports.default = Position;
