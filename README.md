# zoidberg 2015

Compiler for zoidberg 2015 (draft2).

### Goal

```zb
# Import standard library methods
using process.stdout;
using http.createServer;

main(argv) {
  # Create server from req -> res function
  server = createServer(req => {
    statusCode: 200,
    headers: Map(
      # Map<K, V> is constructed from Tuple<K, V> arguments
      ("Content-Type", "text/plain; charset=utf-8")
    ),
    body: "ok: \{req.url}"
  });
  # Named parameters are used to simulate method overloading.
  # Parameters have to be provided or have a default value.
  # If the server fails to liste, an error will be thrown.
  addr = server.listen(port = 3000);
  # The promise returned by server.listen is handled automatically
  # by the compiler, allowing for simple property access.
  # Streams support stream operators like `<<` and `>>`.
  stdout << "Listening on \{addr.port}\n";
  # This will block and wait for the server to close.
  # Once it closes, it returns `0`. If the server emits an error,
  # it will be thrown.
  return server.run();
}
```
