"use strict";

var _bluebird = require("bluebird");

let readFile = _bluebird.coroutine(function* (filename, encoding) {
  return Promise.resolve("Hello World!");
});

let main = _bluebird.coroutine(function* (argv) {
  const contents = (0, readFile)("my-file", "utf8");
  (0, puts)((yield contents));
  return Promise.resolve(0);
});

if (module === require.main) {
  new Promise(function (resolve) {
    return resolve(main(process.argv));
  }).then(function (code) {
    process.exit(code);
  }).then(null, function (err) {
    setImmediate(function () {
      throw err;
    });
  });
}function puts(str) {
  console.log(str);
}
