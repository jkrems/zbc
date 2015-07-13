'use strict';

const vm = require('vm');

const test = require('tape');
const debug = require('debug')('zbc:test:functional');

const zb2js = require('../..').zb2js;

const options = {
  babel: {
    "whitelist": [
      "bluebirdCoroutines",
      "strict",
      "es6.arrowFunctions",
      "es6.classes",
      "es6.destructuring",
      "es6.modules",
      "es6.parameters",
      "es6.spread",
      "es7.asyncFunctions",
      "es7.decorators"
    ]
  }
};

class ZBContext {
  constructor() { this.ctx = vm.createContext({ require: require }); }

  zb(source) { return this.js(zb2js(source, options).code); }

  js(source) {
    const result = vm.runInContext(source, this.ctx);
    debug('eval(%j):', source, result);
    return result;
  }
}

test('Function that returns 0', function(t) {
  const zbCtx = new ZBContext();
  zbCtx.zb('f() { 0; }');
  t.equal(zbCtx.js('f();'), 0, 'f() === 0');
  t.end();
});

test('Function that eventually returns "ok"', function(t) {
  t.plan(1);
  const zbCtx = new ZBContext();
  zbCtx.zb('f() { &"ok"; }');
  zbCtx.js('f();').done(function(value) {
    t.equal(value, 'ok', 'f() === &"ok"');
  });
});

test('Function in nested namespace', function(t) {
  const zbCtx = new ZBContext();
  zbCtx.zb(`
namespace ns {
  namespace nested {
    f() { "ok"; }
  }
}
f() { ns::nested::f(); }`);
  t.equal(zbCtx.js('f();'), 'ok', 'f() === ns.nested.f() === "ok"');
  t.end();
});

test('Function that returns arr[0]', function(t) {
  const zbCtx = new ZBContext();
  zbCtx.zb('first() { arr = [ "ok", "not ok" ]; arr[0]; }');
  t.equal(zbCtx.js('first();'), 'ok', 'first() === "ok"');
  t.end();
});

test('Function that returns str.length', function(t) {
  const zbCtx = new ZBContext();
  zbCtx.zb('len(str: String) { str.length; }');
  t.equal(zbCtx.js('len("ok");'), 2, 'len("ok") === 2');
  t.end();
});

test('Pushing an element onto an array', function(t) {
  const zbCtx = new ZBContext();
  zbCtx.zb('push(arr, el) { arr.push(el); } f() { push([ 1, 3 ], 7); }');
  t.equal(zbCtx.js('f();'), 3, 'f() === 3');
  t.end();
});
