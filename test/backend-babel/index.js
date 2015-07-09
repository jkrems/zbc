'use strict';

const zb = require('../..');
const toJS = require('../../lib/backend-babel');

const zbAst = zb.infer('getName() { &"Quinn"; }');

const babelOpts = {
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
};

const result = toJS(zbAst, babelOpts);
console.log(result.code);
