import { PassThrough } from 'stream'
import { NormalizedComposedServiceConfig, ReadyConfigContext } from './config'
import { InternalProcess } from './InternalProcess'

export class ComposedService {
  readonly id: string
  readonly config: NormalizedComposedServiceConfig
  readonly output = new PassThrough()
  private readonly die: (message: string) => Promise<never>
  private proc: InternalProcess | undefined
  private startPromise: Promise<void> | undefined
  private stopPromise: Promise<void> | undefined
  constructor(
    id: string,
    config: NormalizedComposedServiceConfig,
    die: (message: string) => Promise<never>
  ) {
    this.id = id
    this.config = config
    this.die = die
  }
  start() {
    if (!this.startPromise) {
      console.log(`Starting service '${this.id}'...`)
      this.proc = new InternalProcess(this.config.command, this.config.env)
      this.proc.output.pipe(this.output)
      this.proc.ended.then(() =>
        this.die(`Process for service '${this.id}' exited`)
      )
      const ctx: ReadyConfigContext = { output: this.proc.output }
      this.startPromise = Promise.all([
        promiseTry(() => this.config.ready(ctx)).catch(error => {
          const prefix = `Error waiting for service '${this.id}' to be ready`
          return this.die(`${prefix}:\n${maybeErrorText(error)}`)
        }),
        this.proc.started.catch(error => {
          this.proc!.output.unpipe(this.output)
          this.output.end()
          const prefix = `Error spawning process for service '${this.id}'`
          return this.die(`${prefix}:\n${error}`)
        }),
      ]).then(() => {
        console.log(`Started service '${this.id}'`)
      })
    }
    return this.startPromise
  }
  stop() {
    if (!this.stopPromise) {
      if (!this.proc || this.proc.isEnded) {
        this.stopPromise = Promise.resolve()
      } else {
        console.log(`Stopping service '${this.id}'...`)
        this.stopPromise = this.proc.end().then(() => {
          console.log(`Stopped service '${this.id}'`)
        })
      }
    }
    return this.stopPromise
  }
}

export function maybeErrorText(maybeError: any): string {
  return (maybeError instanceof Error && maybeError.stack) || String(maybeError)
}

function promiseTry<T>(fn: () => Promise<T>) {
  try {
    return Promise.resolve(fn())
  } catch (error) {
    return Promise.reject(error)
  }
}
