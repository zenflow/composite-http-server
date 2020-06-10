import serializeJavascript from 'serialize-javascript'
import { spawn } from 'child_process'
import { once } from 'events'
import mergeStream from 'merge-stream'
import splitStream from 'split'
import { CompositeServiceConfig } from '../../..'

const LOG_OUTPUT_LINES = false

export interface CompositeProcess {
  output: string[]
  ready: Promise<void>
  end(): Promise<void>
  ended: Promise<void>
}

export function getCompositeProcess(
  config: CompositeServiceConfig
): CompositeProcess {
  const configString = serializeJavascript(config, { unsafe: true })
  const script = `require('.').startCompositeService(${configString})`
  const proc = spawn('node', ['-e', script])
  const outputStream = mergeStream([
    proc.stdout.setEncoding('utf8').pipe(splitStream()),
    proc.stderr.setEncoding('utf8').pipe(splitStream()),
  ])
  if (LOG_OUTPUT_LINES) {
    outputStream.on('data', line => console.log(line))
  }
  const output: string[] = []
  outputStream.on('data', line => output.push(line))
  let didExit = false
  const ended: Promise<void> = once(outputStream, 'end').then(() => {
    didExit = true
  })
  const end = (): Promise<void> => {
    if (!didExit) {
      proc.kill('SIGINT')
    }
    return ended
  }
  const ready: Promise<void> = new Promise(resolve =>
    outputStream.on('data', line => {
      if (line === 'Started all services') {
        resolve()
      }
    })
  )
  return { output, ready, end, ended }
}

export async function getReadyCompositeProcess(
  config: CompositeServiceConfig
): Promise<CompositeProcess> {
  const proc = getCompositeProcess(config)
  await Promise.race([
    proc.ready,
    proc.ended.then(() => Promise.reject(new CompositeProcessCrashError())),
  ])
  return proc
}

export class CompositeProcessCrashError extends Error {
  message = 'CompositeProcessCrashError'
}
