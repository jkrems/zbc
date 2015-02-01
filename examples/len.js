/*
 * @param argv {Array.<String>}
 */
function main(argv) {
  return argv.length - 2;
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