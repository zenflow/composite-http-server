import { Readable } from 'stream'
import { waitUntilUsedOnHost } from 'tcp-port-used'
import { createProcess, Logger } from './helpers'

export interface ServerProcessConfig {
  label: string
  env: object
  command: string | string[]
  host: string
  port: number
}

export interface ServerProcess {
  label: string
  outputStream: Readable
  exited: Promise<void>
  kill(): Promise<void>
  ready: Promise<void>
}

export function createServerProcess(
  logger: Logger,
  { label, env, command, host, port }: ServerProcessConfig
): ServerProcess {
  logger.log(`Starting server '${label}'...`)
  const { outputStream, exited, kill } = createProcess(command, {
    PORT: port,
    ...env,
  })
  const ready = waitUntilUsedOnHost(port, host, 500, 2147483647).then(() =>
    logger.log(`Started server '${label}' @ http://${host}:${port}`)
  )
  return { label, outputStream, exited, kill, ready }
}
