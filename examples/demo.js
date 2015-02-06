/* global process */
/* global argv */
/*
 * @param argv {?}
 * @returns {?}
 */
function main(argv) {
  const c = 'c';
  const n = 42 + process.pid;
  const f = 0.2;
  const stdout = process.stdout;
  const name = 'Quinn';
  stdout.write('Static\tEsc\\apes\n');
  stdout.write(`${ name } says "Hello"
`);
  stdout.write(argv.map(x => x.length).join(' :: '));
  stdout.write('\n');
  stdout.write(`Hello ${ name }!
`);
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