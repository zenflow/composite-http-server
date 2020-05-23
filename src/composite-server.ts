import mergeStream from 'merge-stream'
import {
  CompositeServerConfig,
  NormalizedCompositeServerConfig,
  validateAndNormalizeConfig,
} from './config'
import { assert, Logger, mapStream, rightPad } from './helpers'
import {
  ServerProcess,
  ServerProcessConfig,
  createServerProcess,
} from './server-process'

let started: boolean = false

export function startCompositeServer(config: CompositeServerConfig): void {
  assert(!started, 'Cannot start group server more than once')
  started = true

  const normalizedConfig = validateAndNormalizeConfig(config)

  const proxyLabel = '$proxy'
  const maxLabelLength = Math.max(
    proxyLabel.length,
    ...normalizedConfig.servers.map(({ label }) => label.length)
  )

  const output = mergeStream()
  output.pipe(process.stdout)

  const logger = new Logger()
  output.add(logger)
  if (config.printConfig) {
    logger.log(`config = ${JSON.stringify(normalizedConfig, null, 2)}`)
  }

  const serverProcesses: ServerProcess[] = []
  function getServerProcess(config: ServerProcessConfig): ServerProcess {
    const proc = createServerProcess(logger, config)
    serverProcesses.push(proc)
    output.add(
      proc.outputStream.pipe(
        mapStream(line => `${rightPad(proc.label, maxLabelLength)} | ${line}`)
      )
    )
    proc.exited.then(() => exit(`Server '${proc.label}' exited`))
    return proc
  }

  let exiting = false
  function exit(message: string) {
    if (exiting) return
    exiting = true
    logger.log(message)
    logger.log('Stopping servers...')
    Promise.all(serverProcesses.map(({ kill }) => kill()))
      .then(() => logger.log('Stopped servers'))
      .catch(error =>
        logger.log(
          `Error stopping servers: ${
            error instanceof Error ? error.stack : error
          }`
        )
      )
      .then(() => process.exit(1))
  }

  doAsyncStartup(normalizedConfig, getServerProcess)
    .then(() => logger.log('Ready'))
    .catch(error => exit(`${error instanceof Error ? error.stack : error}`))
}

async function doAsyncStartup(
  config: NormalizedCompositeServerConfig,
  getServerProcess: (config: ServerProcessConfig) => ServerProcess
): Promise<void> {
  const userServerProcesses = config.servers.map(getServerProcess)
  await Promise.all(userServerProcesses.map(({ ready }) => ready))

  const proxyProcess = getServerProcess({
    label: '$proxy',
    env: { HTTP_SERVER_GROUP_CONFIG: JSON.stringify(config) },
    command: ['node', `${__dirname}/proxy.js`],
    host: 'localhost',
    port: process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : config.defaultPort,
  })
  await proxyProcess.ready
}
