const Promise = require('bluebird');
const process = require('process'), stdout = process.stdout;
const http = require('http'), createServer = http.createServer;
/*
 * @param req {HttpRequest}
 * @param res {Stream}
 * @returns {Void}
 */
const handleReq = Promise.coroutine(function* handleReq(req, res) {
  res.write('ok\n');
  res.end();
});
/*
 * @param argv {Array.<String>}
 * @returns {Int}
 */
const main = Promise.coroutine(function* main(argv) {
  const server = createServer(handleReq);
  const port = yield new Promise(resolve => {
    server.listen(0, function () {
      resolve(this.address());
    });
  }).then(x => x.port);
  stdout.write(`Listening on ${ port }
`);
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