import mergeStream from 'merge-stream'
import serializeJavascript from 'serialize-javascript'
import {
  CompositeServiceConfig,
  NormalizedCompositeServiceConfig,
  validateAndNormalizeConfig,
} from './config'
import { assert, mapStream, rightPad } from './util'
import { ComposedService } from './ComposedService'

let started = false
export function startCompositeService(config: CompositeServiceConfig) {
  assert(!started, 'Already started a composite service in this process')
  started = true
  new CompositeService(config)
}

class CompositeService {
  private config: NormalizedCompositeServiceConfig
  private services: ComposedService[]
  private serviceMap: Map<string, ComposedService>
  private stopping = false

  constructor(config: CompositeServiceConfig) {
    const printConfig = () =>
      console.log(
        'config =',
        serializeJavascript(config, { space: 2, unsafe: true })
      )
    // TODO: return any errorS (plural) from validateAndNormalizeConfig (as well as normalized config)
    try {
      this.config = validateAndNormalizeConfig(config)
    } catch (error) {
      printConfig()
      throw error
    }
    if (this.config.printConfig) {
      printConfig()
    }

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => {
        this.die(`Received shutdown signal '${signal}'`)
      })
    }

    this.services = Object.entries(this.config.services).map(
      ([id, config]) => new ComposedService(id, config, this.die.bind(this))
    )
    this.serviceMap = new Map(
      this.services.map(service => [service.id, service])
    )

    const maxLabelLength = Math.max(
      ...Object.keys(this.config.services).map(({ length }) => length)
    )
    mergeStream(
      this.services.map(service =>
        service.output.pipe(
          mapStream(line => `${rightPad(service.id, maxLabelLength)} | ${line}`)
        )
      )
    ).pipe(process.stdout)

    console.log('Starting all services...')
    Promise.all(
      this.services.map(service => this.startService(service))
    ).then(() => console.log('Started all services'))
  }

  private async startService(service: ComposedService) {
    await Promise.all(
      service.config.dependencies.map(id =>
        this.startService(this.serviceMap.get(id)!)
      )
    )
    if (this.stopping) return
    await service.start()
  }

  private die(message: string): Promise<never> {
    if (!this.stopping) {
      this.stopping = true
      console.log(message)
      console.log('Stopping all services...')
      Promise.all(this.services.map(service => this.stopService(service)))
        .then(() => console.log('Stopped all services'))
        // Wait one tick for output to flush
        .then(() => process.exit(1))
    }
    // simply return a promise that never resolves, since we can't do anything after exiting anyways
    return new Promise<never>(() => {})
  }

  private async stopService(service: ComposedService) {
    await Promise.all(
      service.config.dependencies.map(id =>
        this.stopService(this.serviceMap.get(id)!)
      )
    )
    await service.stop()
  }
}
