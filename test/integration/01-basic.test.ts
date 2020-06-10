import { CompositeProcess } from './helpers/composite-process'

const getConfig = () => ({
  services: {
    first: {
      command: `node test/integration/fixtures/http-service.js`,
      env: {
        PORT: 3000,
        // delays make the order of events, & thus the output, deterministic
        START_DELAY: 500,
        STOP_DELAY: 250,
      },
      ready: () => require('.').oncePortUsed(3000),
    },
    second: {
      command: ['node', `test/integration/fixtures/noop-service.js`],
      // `env` & `ready` not required
    },
    third: {
      dependencies: ['first', 'second'],
      command: ['node', `test/integration/fixtures/noop-service.js`],
      ready: (ctx: any) =>
        require('.').onceOutputLineIs(ctx.output, 'Started 🚀\n'),
    },
  },
})

describe('basic', () => {
  jest.setTimeout(process.platform === 'win32' ? 15000 : 5000)
  let proc: CompositeProcess | undefined
  afterEach(async () => {
    if (proc) await proc.end()
  })
  it('works', async () => {
    proc = await new CompositeProcess(getConfig()).start()
    expect(proc.flushOutput()).toMatchInlineSnapshot(`
      Array [
        "Starting all services...",
        "Starting service 'first'...",
        "Starting service 'second'...",
        "second | Started 🚀",
        "Started service 'second'",
        "first  | Started 🚀",
        "Started service 'first'",
        "Starting service 'third'...",
        "third  | Started 🚀",
        "Started service 'third'",
        "Started all services",
      ]
    `)
    await proc.end()
    if (process.platform === 'win32') {
      // Windows doesn't support gracefully terminating processes :(
      expect(proc.flushOutput()).toStrictEqual(['', ''])
    } else {
      expect(proc.flushOutput()).toMatchInlineSnapshot(`
        Array [
          "Received shutdown signal 'SIGINT'",
          "Stopping all services...",
          "Stopping service 'first'...",
          "Stopping service 'second'...",
          "second | ",
          "second | ",
          "Stopped service 'second'",
          "first  | ",
          "first  | ",
          "Stopped service 'first'",
          "Stopping service 'third'...",
          "third  | ",
          "third  | ",
          "Stopped service 'third'",
          "Stopped all services",
          "",
          "",
        ]
      `)
    }
  })
})
