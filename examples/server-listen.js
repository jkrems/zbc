/* Import: http */
const http = require('http'), createServer = http.createServer;
/*
 * @param argv {?}
 * @returns {?}
 */
function main(argv) {
  const server = createServer();
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