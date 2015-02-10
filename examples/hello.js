/* global process */
/* global argv */
const Promise = require('bluebird');
/*
 * @param argv {Array.<String>}
 * @returns {Int}
 */
const main = Promise.coroutine(function* main(argv) {
  process.stdout.write('Hello World\n');
  return 0;
});
if (require.main === module) {
  new Promise(resolve => {
    resolve(main(process.argv));
  }).then(process.exit, error => {
    setImmediate(() => {
      throw error;
    });
  });
}