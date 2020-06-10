import { NormalizedComposedServiceConfig, ReadyConfigContext } from './config'
import { InternalProcess } from './InternalProcess'

export class ComposedService {
  id: string
  config: NormalizedComposedServiceConfig
  private process: InternalProcess | undefined
  private startPromise: Promise<void> | undefined
  private stopPromise: Promise<void> | undefined
  constructor(id: string, config: NormalizedComposedServiceConfig) {
    this.id = id
    this.config = config
  }
  start(
    onceStarting: (startPromise: Promise<any>, process: InternalProcess) => void
  ) {
    if (!this.startPromise) {
      this.process = new InternalProcess(this.config.command, this.config.env)
      const ctx: ReadyConfigContext = { output: this.process.output }
      this.startPromise = Promise.resolve().then(() => this.config.ready(ctx))
      onceStarting(this.startPromise, this.process)
    }
    return this.startPromise
  }
  stop(onceStopping: (stopPromise: Promise<any>) => void) {
    if (!this.process || this.process.isEnded) {
      return Promise.resolve()
    }
    if (!this.stopPromise) {
      this.stopPromise = this.process.end()
      onceStopping(this.stopPromise)
    }
    return this.stopPromise
  }
}
