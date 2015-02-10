const Promise = require('bluebird');
/*
 * @param argv {Array.<String>}
 * @returns {Int}
 */
const main = Promise.coroutine(function* main(argv) {
  return argv.length - 2;
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