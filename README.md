# composite-service

Helps you to compose multiple services into one

Define your composite service in a script like this one...

```js
// composite.js

const { findPorts, startCompositeService, oncePortUsed } = require('composite-service')

const { PORT } = process.env
const [apiPort, webPort] = findPorts(2, { exclude: PORT })

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
const [apiPort, webPort] = findPorts(2, { exclude: PORT })

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

The composite service shares the above characteristics. It is a terminal program and shouldn't exit until receiving a
shutdown signal. *However*, if any of the composed services crash, the composite service will crash (after stopping
remaining composed services)

## Motivation

Sometimes we want to use some open-source (or just reusable) service in our app or service.
If we think of that reusable service as a *component* of our overall service,
then we might want to include it *in* our overall service,
rather than running it separately, and deploying it separately, as its own independent service.

Advantages of running as a single service:

1. simplified deployments & devops; works smoothly with any PaaS provider; never a need to update production services in a certain order
2. allows us to effectively use PaaS features like [Heroku's Review Apps](https://devcenter.heroku.com/articles/github-integration-review-apps)
3. with some PaaS providers (e.g. Heroku, render) saves the cost of hosting additional "apps" or "services"
4. fewer steps (i.e. one step) to start the entire system (locally or in CI) for testing (manual or automated), and sometimes even for local development

Another possible use case is grouping a bunch of "microservices" into one, to gain the same advantages listed above, as well as most of the advantages of microservices:
- Composed services do, on a lower level, still run as independent programs, so one of them crashing doesn't interrupt the others.
- Composed services may (or may not) be developed independently, in various repositories, by various teams, using various tools & languages.
- Composed services can be run/deployed independently with minimal effort; you can easily *de*compose your composite service.

## Roadmap

- propagate 'error' events from child processes
- default `service[].ready` to `() => oncePortUsed(process.env.PORT)` if `process.env.PORT` is defined
- service config `stdin`, default: process.stdin
- use TS classes *sigh*
- generate typedoc site
- service `beforeStarting`, `afterStarted`, `beforeStopping`, `afterStopped`
- service configs `preStart` & `postStart` (both with support for Cancellable Async Flows), `preStop` & `postStop` (without)
- coerce config field types, for non-TS users
- check for excess config fields, for non-TS users
- tests for various configurations
    - printConfig
    - config that fails validation (also, in source, handle: same port used twice, same label used twice, etc.)
- use `npm-run-path` package

## Feature ideas

- new helpers for `ready` config:
    - `onceOutput(test: (line: string) => boolean): Promise<void>`
    - `onceOutputIncludes(text: string): Promise<void>`
- `config.service[].handleExit` 'exit', 'restart', or function. Default 'exit' (which is only current behavior)
- `config.service[].startupTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- for *nix: graceful shutdown & `config.service[].forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `config.service[].scale`
    - maybe: number of workers in node cluster (support node servers only)
    - maybe: number of processes to start (requires configuring more port numbers & doing round-robin in proxy)
- use same node binary that main process was started with

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
