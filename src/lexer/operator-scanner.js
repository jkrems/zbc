'use strict';

// Only supports one or two-char operators
function makeOperatorScanner(operators, success, failure) {
  var texts = Object.keys(operators);

  var byFirstChar = {};
  texts.forEach(function(text) {
    if (!byFirstChar[text[0]]) {
      byFirstChar[text[0]] = {};
    }
    byFirstChar[text[0]][text[1] || ''] = operators[text];
  });

  return function(lexer) {
    let candidates = byFirstChar[lexer.c];
    if (!candidates) { return failure; }

    let candiate = candidates[lexer.next()];
    if (candiate !== undefined) {
      lexer.next();
      lexer.emit(candiate);
      return success;
    } else if (candidates[''] !== undefined) {
      lexer.emit(candidates['']);
      return success;
    } else {
      return failure;
    }
  };
}

module.exports = makeOperatorScanner;
module.exports.default = makeOperatorScanner;
