/* global process */
/*
 * @param argv {Array.<String>}
 * @returns {Int}
 */
function main(argv) {
  process.stdout.write('Hello World\n');
  return 0;
}
if (require.main === module) {
  new Promise(resolve => {
    resolve(main(process.argv));
  }).then(process.exit, error => {
    setImmediate(() => {
      throw error;
    });
  });
}