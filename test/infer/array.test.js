/* global describe, it */
'use strict';
const typed = require('./typed');
const int = typed.int,
      str = typed.str,
      arr = typed.arr,
      void_ = typed.void_,
      fn = typed.fn;

describe('infer/array', function() {
  it('length', typed`
${fn([ arr(str), int ])}f(argv: String[]) {
  ${arr(str)}${int}argv.length - ${int}2;
}`);

  it('is not thrown off by different kinds of arrays', typed`
${fn([ arr(str), void_ ])}f(${arr(str)}argv: String[]) {}
${fn([ arr(int), void_ ])}g(${arr(int)}ints: Int[]) {}
`)
});
