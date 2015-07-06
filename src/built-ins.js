'use strict';

function registerBuiltIns(types) {
  // const Arr = types.register('Array', [ 'ItemType' ]);
  //   .addProperty('length', Int);
  // types.register('Void', []);
  // types.register('Char', []);
  // types.register('Float', []);
  // const Stream = types.register('Stream', []);
  /* const Fn = */ types.register('Function');

  // const t0 = types.createUnknown();
  // Arr.addProperty('unary*', Fn.createInstance([ Arr.createInstance([t0]), t0 ]));
  // const t1 = types.createUnknown();
  // Arr.addProperty('join', Fn.createInstance([ Arr.createInstance([t1]), Str ]));

  return types;
}

module.exports = registerBuiltIns;
module.exports.default = registerBuiltIns;
