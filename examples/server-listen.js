const http = require('http'), createServer = http.createServer;
/*
 * @param argv {?}
 * @returns {?}
 */
function main(argv) {
  const server = createServer();
  server.listen(0);
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