# composite-service

Helps you to compose multiple services into one

Define your composite service in a script like this one...

```js
// composite.js

const { startCompositeService, oncePortUsed } = require('composite-service')

const { PORT } = process.env
const [apiPort, webPort] = [8000, 8001]

startCompositeService({
  services: {
    api: {
      command: 'node api/server.js',
      env: { PORT: apiPort },
      ready: () => oncePortUsed(apiPort),
    },
    web: {
      command: 'node web/server.js',
      env: { PORT: webPort },
      ready: () => oncePortUsed(webPort),
    },
    proxy: {
      dependencies: ['api', 'web'],
      command: 'node proxy.js',
      env: { PORT, API_PORT: apiPort, WEB_PORT: webPort },
      ready: () => oncePortUsed(PORT),
    },
  },
})
```

Run it with a defined `PORT`...

```
$ PORT=3000 && node composite.js
Starting all services...
Starting service 'api'...
Starting service 'web'...
api   | Started 🚀
web   | Started 🚀
Started service 'api'
Started service 'web'
Starting service 'proxy'...
proxy | Started 🚀
Started service 'proxy'
Started all services
```

You now have an http server running on the defined `PORT` which handles requests by proxying them to either of the other two internal/composed servers:
- all requests with URL under `/api` go to "api"
- all other requests with URL under `/` go to "web"

Now try pressing ctrl+C on your keyboard... (TODO)

Now suppose you want to use the included http proxy server instead of writing (and re-writing) your own.
You can use `configureHttpProxy` to configure it, like this...

```js
// composite.js

const { findPorts, startCompositeService, oncePortUsed, configureHttpProxy } = require('composite-service')

const { PORT } = process.env
const [apiPort, webPort] = [8000, 8001]

startCompositeService({
  services: {
    api: {
      command: 'node api/server.js',
      env: { PORT: apiPort },
      ready: () => oncePortUsed(apiPort),
    },
    web: {
      command: 'node web/server.js',
      env: { PORT: webPort },
      ready: () => oncePortUsed(webPort),
    },
    proxy: configureHttpProxy({
      dependencies: ['api', 'web'],
      port: PORT,
      proxies: [
        { context: '/api', target: `http://localhost:${apiPort}` },
        { context: '/', target: `http://localhost:${webPort}` },
      ],
    }),
  },
})
```

The examples only show composing nodejs http servers, but a service can be any program that fits this description:
1. Runs in the terminal (i.e. in the foreground, not daemonized and in the background)
2. Should run until receiving a shutdown (`SIGINT` or `SIGTERM`) signal. Should not exit by itself, as that would be considered a crash.

The composite service shares the above characteristics.
It is a terminal program and shouldn't exit until receiving a shutdown signal.
*However*, if any fatal errors occur, the composite service will stop any running services and exit with exit code `1`.
Fatal errors can be: ... TODO

## Motivation

Sometimes we want to use some open-source (or just reusable) service in our app or service.
If we think of that reusable service as a *component* of our overall service,
then we might want to include it *in* our overall service,
rather than running it separately, and deploying it separately, as its own independent service.

Advantages of running as a single service:

1. simplified deployments & devops; works smoothly with any PaaS provider; never a need to update production services in a certain order
2. allows us to effectively use PaaS features like [Heroku's Review Apps](https://devcenter.heroku.com/articles/github-integration-review-apps)
3. with some PaaS providers (e.g. Heroku, render) saves the cost of hosting additional "apps" or "services"
4. fewer steps (i.e. one step) to start the entire system (locally or in CI) for integration testing (manual or automated), and sometimes even for local development

Another possible use case is grouping a bunch of "microservices" into one, to gain the same advantages listed above, as well as most of the advantages of microservices:

- Services can be developed independently, to a range of degrees, from simply giving each it's own `package.json`,
to having many repos, languages, and teams.
- One service crashing doesn't interrupt the others, since they still, on a lower level run as independent programs.
That (running independently on low level) also means that you can easily *de*compose your composite service at any time.

## Roadmap

- propagate 'error' events from child processes
- httpProxyService()
- service config `stdin`, default: process.stdin
- service `beforeStarting`, `afterStarted`, `beforeStopping`, `afterStopped`
- export `assertPortFree` helper
- `const [apiPort, webPort] = findPorts(2, { exclude: PORT })`
- `config.service[].tcp: {port, host?}` ??? tcpService(config): ComposedServiceConfig ????
    1. assigns PORT (and HOST applicable) env vars
    2. wraps `beforeStarting` to use `assertPortFree`
    3. sets default `started` to `() => oncePortUsed(port)`
- use `npm-run-path` package
- `config.service[].handleExit` 'exit', 'restart', or function. Default 'restart'
- check for excess config fields
- tests
    - unit tests for validation
    - test config that fails at runtime (invalid command, specified port in use, etc.)
    - test ctrl+c virtual-SIGINT shutdown
- generate typedoc site

## Feature ideas

- `config.service[].startupTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- for *nix: graceful shutdown & `config.service[].forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `nodeClusterService({script: '...', scale: 4})` (uses same node binary that main process was started with)
- http-proxy: stop accepting new requests, but finish pending requests, when SIGTERM received

## Changelog

- `v3.0.0`
    - `ready` & `dependencies` service configs
    - Support composing services without http proxy
    - Require explicit propagation of environment variables to composed services *if `env` is defined*
    - `findPorts` utility
    - Revised names & interfaces
- `v2.0.0`
    - Run server procs w/o shell & kill server procs normally (w/o tree-kill) (32723c73467522551bc57da8575f57f59d04d11d)
    - Ensure importing module is free of side-effects (efeab195b234cac153b601dd1e0835cbd53bcf2d)
- `v1.1.0`
    - Shutdown gracefully in non-windows environments (bce5500c99c6eec2acd7262ae70a4e6cb52b9d1c)
- `v1.0.0`
    - Initial commit
