import { NormalizedComposedServiceConfig, ReadyConfigContext } from './config'
import { InternalProcess } from './InternalProcess'

export type OnceStartingHandler = (
  startPromise: Promise<any>,
  process: InternalProcess
) => void
export type OnceStoppingHandler = (stopPromise: Promise<any>) => void

export class ComposedService {
  readonly id: string
  readonly config: NormalizedComposedServiceConfig
  private process: InternalProcess | undefined
  private startPromise: Promise<void> | undefined
  private stopPromise: Promise<void> | undefined
  private readonly onceStarting: OnceStartingHandler
  private readonly onceStopping: OnceStoppingHandler
  constructor(
    id: string,
    config: NormalizedComposedServiceConfig,
    onceStarting: OnceStartingHandler,
    onceStopping: OnceStoppingHandler
  ) {
    this.id = id
    this.config = config
    this.onceStarting = onceStarting
    this.onceStopping = onceStopping
  }
  start() {
    if (!this.startPromise) {
      this.process = new InternalProcess(this.config.command, this.config.env)
      const ctx: ReadyConfigContext = { output: this.process.output }
      this.startPromise = Promise.resolve().then(() => this.config.ready(ctx))
      this.onceStarting(this.startPromise, this.process)
    }
    return this.startPromise
  }
  stop() {
    if (!this.process || this.process.isEnded) {
      return Promise.resolve()
    }
    if (!this.stopPromise) {
      this.stopPromise = this.process.end()
      this.onceStopping(this.stopPromise)
    }
    return this.stopPromise
  }
}
