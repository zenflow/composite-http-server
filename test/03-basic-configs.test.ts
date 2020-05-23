// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  getReadyCompositeServerProcess,
  CompositeServerProcess,
  // @ts-ignore
} from './helpers/compositeServerProcess'
import { CompositeServerConfig } from '..'

describe('basic configs', () => {
  jest.setTimeout(30 * 1000) // set high for windows which takes forever (~15 seconds for me) to kill processes
  let proc: CompositeServerProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  describe('defaultPort', () => {
    const defaultPortConfig: () => CompositeServerConfig = () => ({
      defaultPort: 3002,
      servers: [
        {
          label: 'only',
          env: { RESPONSE_TEXT: 'only' },
          command: `node test/fixtures/constituent-server.js`,
          port: 3001,
          httpProxyPaths: ['/'],
        },
      ],
    })
    it('works', async () => {
      proc = await getReadyCompositeServerProcess(
        undefined,
        defaultPortConfig()
      )
      expect(await fetchText('http://localhost:3002/')).toBe('only')
    })
    it('does not take precedence over PORT env var', async () => {
      proc = await getReadyCompositeServerProcess(3000, defaultPortConfig())
      expect(await fetchText('http://localhost:3000/')).toBe('only')
    })
  })
})
