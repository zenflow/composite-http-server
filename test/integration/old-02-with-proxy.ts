// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  getReadyCompositeProcess,
  CompositeProcess,
  // @ts-ignore
} from './helpers/composite-process'
import { CompositeServerConfig } from '../../dist'

const basicConfig = (): CompositeServerConfig => ({
  servers: [
    {
      label: 'other',
      command: ['node', 'test/fixtures/constituent-server.js'],
      env: {
        PORT: 3001,
        RESPONSE_TEXT: 'other',
      },
    },
    {
      label: 'default',
      command: 'node test/fixtures/constituent-server.js',
      env: {
        PORT: 3002,
        RESPONSE_TEXT: 'default',
      },
    },
    httpProxyServer({
      label: '$proxy',
      dependsOn: ['other', 'default'],
      // host: 'localhost', // default
      port: 3000,
      proxies: [
        {
          // to 'other' server
          paths: ['/other'],
          target: `http://localhost:3001`,
        },
        {
          // to 'default' server
          paths: ['/'],
          target: `http://localhost:3002`,
        },
      ],
    }),
  ],
})

describe.skip('basic', () => {
  jest.setTimeout(30 * 1000) // set high for windows which takes forever (~15 seconds for me) to kill processes
  let proc: CompositeProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  it('works', async () => {
    proc = await getReadyCompositeProcess(3000, basicConfig())
    expect(await fetchText('http://localhost:3000/other')).toBe('other')
    expect(await fetchText('http://localhost:3000/other/foo')).toBe('other')
    expect(await fetchText('http://localhost:3000/')).toBe('default')
    expect(await fetchText('http://localhost:3000/foo')).toBe('default')
  })
  it('has consistent output', async () => {
    proc = await getReadyCompositeProcess(3000, basicConfig())

    const initialOutput = proc.output.splice(0)
    expect(initialOutput[0]).toBe(`Starting server 'other'...`)
    expect(initialOutput[1]).toBe(`Starting server 'default'...`)
    const othOutStartedLine = initialOutput.indexOf(
      `other   | [out] Started 🚀`
    )
    expect(othOutStartedLine).toBeGreaterThan(1)
    const defOutStartedLine = initialOutput.indexOf(
      `default | [out] Started 🚀`
    )
    expect(defOutStartedLine).toBeGreaterThan(1)
    const startedOthLine = initialOutput.indexOf(
      `Started server 'other' @ http://localhost:3001`
    )
    expect(startedOthLine).toBeGreaterThan(othOutStartedLine)
    const startedDefLine = initialOutput.indexOf(
      `Started server 'default' @ http://localhost:3002`
    )
    expect(startedDefLine).toBeGreaterThan(defOutStartedLine)
    expect(Math.max(startedOthLine, startedDefLine)).toBe(5)
    expect(initialOutput[6]).toBe(`Starting server '$proxy'...`)
    expect(initialOutput[7]).toBe(
      `Started server '$proxy' @ http://localhost:3000`
    )
    expect(initialOutput[8]).toBe('Ready')
    expect(initialOutput[9]).toBeUndefined()

    await proc.kill()

    const finalOutput = proc.output.splice(0)
    if (process.platform === 'win32') {
      expect(finalOutput[0]).toBe('')
      expect(finalOutput[1]).toBe('')
      expect(finalOutput[2]).toBeUndefined()
    } else {
      expect(finalOutput[0]).toBe('Received SIGINT signal')
      expect(finalOutput[1]).toBe('Stopping servers...')
      expect(finalOutput.slice(2, 8).sort()).toStrictEqual([
        '$proxy  | [ERR] ',
        '$proxy  | [out] ',
        'default | [ERR] ',
        'default | [out] ',
        'other   | [ERR] ',
        'other   | [out] ',
      ])
      expect(finalOutput[8]).toBe('Stopped servers')
      expect(finalOutput[9]).toBe('')
      expect(finalOutput[10]).toBe('')
      expect(finalOutput[11]).toBeUndefined()
    }
  })
})
