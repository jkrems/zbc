'use strict';

class Token {
  constructor(type, text, position) {
    this.type = type;
    this.text = text;
    this.position = position;
  }
}

module.exports = Token;
module.exports.default = Token;
