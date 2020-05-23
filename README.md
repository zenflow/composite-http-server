# composite-http-server

Helps you to compose a single http server program from multiple constituent server programs (http or not).

Given a declarative configuration, including a description of a collection of constituent `servers`, it will:
- Start and manage processes for constituent servers, interleaving and printing the stdout/stderr of each
- Start an http server that proxies requests to the appropriate constituent server, as determined by configuration and the url path of the request

Define your composite server in a script like this one...

```js
// composite.js

const { startCompositeServer } = require('composite-http-server')

startCompositeServer({
  defaultPort: 3000,
  servers: [
    {
      label: 'my-service',
      command: 'node my-service/server.js',
      port: 3001,
      httpProxyPaths: ['/api/my-service'],
    },
    {
      label: 'web',
      command: 'node web/server.js',
      port: 3002,
      httpProxyPaths: ['/'],
      httpProxyOptions: {}
    },
  ],
})
```

Run it...

```
$ node composite.js
Starting server 'my-service'...
Starting server 'web'...
my-service | [out] Started 🚀
web        | [out] Started 🚀
Started server 'web' @ http://localhost:3002
Started server 'my-service' @ http://localhost:3001
Starting server '$proxy'...
Started server '$proxy' @ http://localhost:3000
Ready
```

Now you have an http server running at http://localhost:3000 which proxies requests to either of two underlying "constituent" servers:
- all requests with URL under `/api/my-service` go to "my-service"
- all other requests with URL under `/` go to "web"

### Features

- You can define a constituent server with **no** `httpProxyPaths`, if it is meant to be used only by other constituent servers and not accessible via the http proxy.
- You can define a constituent server that is **not http**, as long as it conforms to the "Specs for generic 'server program'" as described below.
- The composite server starts gracefully; It doesn't accept requests until every constituent server is accepting requests.
- If any constituent server exits (i.e. crashes) the remaining constituent servers will be killed and the composite server will exit.

### Specs for generic 'server program'

This describes behavior which is expected of the constituent servers you define, and which you can expect of the composite server.

- should not exit by itself; should run until killed by another process
- must serve over the port designated by the `PORT` environment variable

### Configuration

- `config.printConfig` (type: `boolean`; optional; default: `false`) If set to `true`, the effective configuration will be printed before starting the composite server. Useful for debugging dynamic configurations.
- `config.defaultPort` (type: `number`; optional; default: `3000`) *Default* port on which to start the composite server. This is *only* used if the `PORT` environment variable is not defined.
- `config.httpProxyOptions` (type: `HttpProxyOptions`; optional; default: `{}`) [http-proxy-middleware options](https://github.com/chimurai/http-proxy-middleware#options) (without `target` or `router`) to be used when proxying to *any* of the described `servers`. You can also set these options per-server with `config.servers[].httpProxyOptions`.
- `config.servers[]` (required) Description of constituent servers. Must contain one or more elements.
- `config.servers[].label` (type: `string`; optional; default: server's index in the array) Symbol used to identify this server.
- `config.servers[].env` (type: `object`; optional; default: `{}`) Environment variables to define for this server's process. It will already inherit all the environment variables of it's parent (the composite server process), so there's no need to explicitly propagate environment variables in your configuration. The constituent server process will also already have `PORT` defined appropriately.
- `config.servers[].command` (type: `string | string[]`; required) Command used to run the server. If it's a single string, it will be run with the system shell. If it's an array of strings, no shell is used, the first element is used as the binary, and the remaining elements are used as arguments. The server should behave according to "Specs for generic 'http server program'" (above).
- `config.servers[].host` (type: `string`; optional; default: `'localhost'`) Hostname that this server can be expected to start on.
- `config.servers[].port` (type: `number`; required) Port number that this server can be expected to start on. This is passed to the constituent server process as the `PORT` environment variable.
- `config.servers[].httpProxyPaths` (type: `string[]`; optional; default: `[]`) Absolute paths to check when determining which server to proxy an http request to. Each request is proxied to the first server that has a path that the request path is within.
- `config.servers[].httpProxyOptions` (type: `HttpProxyOptions`; optional; default: `{}`) [http-proxy-middleware options](https://github.com/chimurai/http-proxy-middleware#options) (without `target` or `router`) to be used for the http proxy to this server. You can also set these options globally with `config.httpProxyOptions`.

## Motivation

Sometimes we may want to use some open-source (or just reusable) http server as a *component* of our app or service.
If we are thinking of that server as a *component* of our overall server, then we might want to include it *in* our
overall server, rather than deploying it as its own independent service.

Advantages of the "single server" (or "monolith") approach:
1. simplifies deployments & devops
2. allows us to deploy to basically any PaaS provider
3. allows us to effectively use PaaS features like [Heroku's Review Apps](https://devcenter.heroku.com/articles/github-integration-review-apps)
4. with some PaaS providers (e.g. Heroku, render) saves the cost of hosting additional "apps" or "services"

There some real advantages of the "multiple servers" (or "microservices") approach too, which you should research for
yourself. I think you will find that these benefits generally apply more to large-scale projects with many services,
and maybe multiple teams. For smaller projects, it seems that the "single service" approach provides more advantage.
Bear in mind that serious projects can often benefit from *starting out* small, and splitting out into separate
services only as needed.

If you are unable build everything into a single http server program running as a single process type (by calling the
server code from your own code) for whatever reason (maybe the constituent server is written in a different language
than the rest of the project, maybe its source code is not available, maybe something else) then you can use
composite-http-server to build everything into a single http server program running multiple process types internally.

## Roadmap

- use `npm-run-path` package
- verify configured ports are available in "pre-flight check", & exit early/immediately if they are not
- export a port finder utility (to be used with `start`)
    - then it is possible to run tests concurrently (should we?)
    - use it internally to get default `servers[].port`
- perf optimization for tests on windows: when cleaning up & killing `proc`, don't wait whole time for proc to have `exited`
- more tests for various configurations
    - printConfig
    - omitting server[].labels, ...
    - config that fails validation (also, in source, handle: same port used twice, same label used twice, etc.)
    - server with no `httpProxyPaths`
    - glob patterns in `httpProxyPaths`
    - httpProxyOptions & `server[].httpProxyOptions`

## Feature ideas

- `config.server[].handleExit` 'exit', 'restart', or function. Default 'exit' (which is only current behavior)
- `config.server[].startupTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- option to log requests in `$proxy` server
- for *nix: graceful shutdown & `config.server[].forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `config.server[].scale`
    - maybe: number of workers in node cluster (support node servers only)
    - maybe: number of processes to start (requires configuring more port numbers & doing round-robin in proxy)
- `config.server[].dependencies`: array of labels of servers to wait for to be ready before starting this server
- use same node binary that main process was started with
