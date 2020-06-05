import { spawn } from 'child_process'
import { join } from 'path'
import { once } from 'events'
import { Readable } from 'stream'
import mergeStream from 'merge-stream'
import splitStream from 'split'
// @ts-ignore
import { CompositeServerConfig } from '../..'

export interface CompositeServerProcess {
  output: string[]
  ready: Promise<void>
  kill(): Promise<void>
  exited: Promise<void>
}

export class CompositeServerProcessExitedError extends Error {
  message = 'ServerGroupProcessExitedError'
}

export function getCompositeServerProcess(
  port: number | undefined,
  config: CompositeServerConfig
): CompositeServerProcess {
  const env = { ...process.env }
  env.CONFIG = JSON.stringify(config)
  if (typeof port !== 'undefined') {
    env.PORT = String(port)
  }
  const script = join(__dirname, '../fixtures/composite-server.js')
  const proc = spawn('node', [script], { env })
  const outputStream = (mergeStream([
    proc.stdout.setEncoding('utf8').pipe(splitStream()),
    proc.stderr.setEncoding('utf8').pipe(splitStream()),
  ]) as unknown) as Readable
  outputStream.on('data', line => console.log(line))
  const output: string[] = []
  outputStream.on('data', line => output.push(line))
  let didExit = false
  const exited: Promise<void> = once(outputStream, 'end').then(() => {
    didExit = true
  })
  const kill = function killChildProcess(): Promise<void> {
    if (!didExit) {
      proc.kill('SIGINT')
    }
    return exited
  }
  const ready: Promise<void> = new Promise(resolve =>
    outputStream.on('data', line => {
      if (line === 'Ready') resolve()
    })
  )
  return { output, ready, kill, exited }
}

export async function getReadyCompositeServerProcess(
  port: number | undefined,
  config: CompositeServerConfig
): Promise<CompositeServerProcess> {
  const proc = getCompositeServerProcess(port, config)
  await Promise.race([
    proc.ready,
    proc.exited.then(() =>
      Promise.reject(new CompositeServerProcessExitedError())
    ),
  ])
  return proc
}
