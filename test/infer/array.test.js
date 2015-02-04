/* global describe, it */
'use strict';
const typed = require('./typed');
const int = typed.int,
      str = typed.str,
      arr = typed.arr,
      fn = typed.fn;

describe('infer/array', function() {
  it('length', typed`${fn([ arr(str), int ])}f(argv: String[]) {
  ${arr(str)}${int}argv.length - ${int}2;
}`);
});
