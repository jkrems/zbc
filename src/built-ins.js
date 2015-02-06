'use strict';

function registerBuiltIns(types) {
  const Int = types.register('Int', []);
  const Str = types.register('String', [])
    .addProperty('length', Int);
  const Arr = types.register('Array', [ 'ItemType' ])
    .addProperty('length', Int);
  types.register('Void', []);
  types.register('Char', []);
  types.register('Float', []);
  const Stream = types.register('Stream', []);
  const Fn = types.register('Function');

  Int.addProperty('operator+', Fn.createInstance([ Int, Int, Int ]));
  Int.addProperty('operator-', Fn.createInstance([ Int, Int, Int ]));

  Stream.addProperty('operator<<', Fn.createInstance([ Stream, Str, Stream ]));

  const t0 = types.createUnknown();
  Arr.addProperty('unary*', Fn.createInstance([ Arr.createInstance([t0]), t0 ]));
  const t1 = types.createUnknown();
  Arr.addProperty('join', Fn.createInstance([ Arr.createInstance([t1]), Str ]));

  return types;
}

module.exports = registerBuiltIns;
module.exports.default = registerBuiltIns;
