import {
  getReadyCompositeServerProcess,
  getCompositeServerProcess,
  CompositeServerProcess,
  // @ts-ignore
} from './helpers/compositeServerProcess'
import { CompositeServerConfig } from '..'

const failureConfig = (
  failureEnv: { [key: string]: string },
  basicEnv: { [key: string]: string }
): CompositeServerConfig => ({
  servers: [
    {
      label: 'failure',
      env: failureEnv,
      command: ['node', 'test/fixtures/constituent-server.js'],
      port: 3001,
      httpProxyPaths: ['/doesntmatter'],
    },
    {
      label: 'default',
      env: basicEnv,
      command: `node test/fixtures/constituent-server.js`,
      port: 3002,
      httpProxyPaths: ['/'],
    },
  ],
})

describe('failure', () => {
  jest.setTimeout(30 * 1000) // set high for windows which takes forever (~15 seconds for me) to kill processes
  let proc: CompositeServerProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  describe('exits when any server exits', () => {
    it('before any server is ready', async () => {
      proc = getCompositeServerProcess(
        3000,
        failureConfig({ EXIT_PRE_START: '1' }, { START_DELAY: '5000' })
      )
      await proc.exited
      expect(proc.output[0]).toBe(`Starting server 'failure'...`)
      expect(proc.output[1]).toBe(`Starting server 'default'...`)
      expect(proc.output.slice(2, 4).sort()).toStrictEqual([
        'failure | [ERR] ',
        'failure | [out] ',
      ])
      expect(proc.output[4]).toBe(`Server 'failure' exited`)
      // doesn't start $proxy
      // stops other server before it becomes ready
      expect(proc.output[5]).toBe('Stopping servers...')
      expect(proc.output.slice(6, 8).sort()).toStrictEqual([
        'default | [ERR] ',
        'default | [out] ',
      ])
      expect(proc.output[8]).toBe('Stopped servers')
      expect(proc.output[9]).toBe('')
      expect(proc.output[10]).toBe('')
      expect(proc.output[11]).toBeUndefined()
    })
    it('before that server is ready & after other server is ready', async () => {
      proc = getCompositeServerProcess(
        3000,
        failureConfig({ EXIT_PRE_START: '1', EXIT_DELAY: '500' }, {})
      )
      await proc.exited
      expect(proc.output[0]).toBe(`Starting server 'failure'...`)
      expect(proc.output[1]).toBe(`Starting server 'default'...`)
      expect(proc.output[2]).toBe(`default | [out] Started 🚀`)
      expect(proc.output[3]).toBe(
        `Started server 'default' @ http://localhost:3002`
      )
      expect(proc.output.slice(4, 6).sort()).toStrictEqual([
        'failure | [ERR] ',
        'failure | [out] ',
      ])
      expect(proc.output[6]).toBe(`Server 'failure' exited`)
      // doesn't start $proxy
      // stops other server
      expect(proc.output[7]).toBe('Stopping servers...')
      expect(proc.output.slice(8, 10).sort()).toStrictEqual([
        'default | [ERR] ',
        'default | [out] ',
      ])
      expect(proc.output[10]).toBe('Stopped servers')
      expect(proc.output[11]).toBe('')
      expect(proc.output[12]).toBe('')
      expect(proc.output[13]).toBeUndefined()
    })
    it('after that server is ready & before other server is ready', async () => {
      proc = getCompositeServerProcess(
        3000,
        failureConfig(
          { EXIT_POST_START: '1', EXIT_DELAY: '1000' },
          { START_DELAY: '5000' }
        )
      )
      await proc.exited
      expect(proc.output[0]).toBe(`Starting server 'failure'...`)
      expect(proc.output[1]).toBe(`Starting server 'default'...`)
      expect(proc.output[2]).toBe(`failure | [out] Started 🚀`)
      expect(proc.output[3]).toBe(
        `Started server 'failure' @ http://localhost:3001`
      )
      expect(proc.output.slice(4, 6).sort()).toStrictEqual([
        'failure | [ERR] ',
        'failure | [out] ',
      ])
      expect(proc.output[6]).toBe(`Server 'failure' exited`)
      // doesn't start $proxy
      // stops other server before it becomes ready
      expect(proc.output[7]).toBe('Stopping servers...')
      expect(proc.output.slice(8, 10).sort()).toStrictEqual([
        'default | [ERR] ',
        'default | [out] ',
      ])
      expect(proc.output[10]).toBe('Stopped servers')
      expect(proc.output[11]).toBe('')
      expect(proc.output[12]).toBe('')
      expect(proc.output[13]).toBeUndefined()
    })
    it('after all servers are up', async () => {
      proc = await getReadyCompositeServerProcess(
        3000,
        failureConfig({ EXIT_POST_START: '1', EXIT_DELAY: '1000' }, {})
      )
      const initialOutput = proc.output.splice(0)
      expect(initialOutput[0]).toBe(`Starting server 'failure'...`)
      expect(initialOutput[1]).toBe(`Starting server 'default'...`)
      // don't bother with lines 2,3,4,5 because race conditions to deal with
      expect(initialOutput[6]).toBe(`Starting server '$proxy'...`)
      expect(initialOutput[7]).toBe(
        `Started server '$proxy' @ http://localhost:3000`
      )
      expect(initialOutput[8]).toBe('Ready')
      expect(initialOutput[9]).toBeUndefined()
      await proc.exited
      const finalOutput = proc.output.splice(0)
      expect(finalOutput.slice(0, 2).sort()).toStrictEqual([
        'failure | [ERR] ',
        'failure | [out] ',
      ])
      expect(finalOutput[2]).toBe(`Server 'failure' exited`)
      expect(finalOutput[3]).toBe('Stopping servers...')
      expect(finalOutput.slice(4, 8).sort()).toStrictEqual([
        '$proxy  | [ERR] ',
        '$proxy  | [out] ',
        'default | [ERR] ',
        'default | [out] ',
      ])
      expect(finalOutput[8]).toBe('Stopped servers')
      expect(finalOutput[9]).toBe('')
      expect(finalOutput[10]).toBe('')
      expect(finalOutput[11]).toBeUndefined()
    })
  })
})
