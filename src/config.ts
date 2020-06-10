import { Options as HttpProxyOptions } from 'http-proxy-middleware'
import mergeStream from 'merge-stream'
import { assert } from './util'

export { HttpProxyOptions }

export interface CompositeServiceConfig {
  /**
   * If set to `true`, the given configuration will be printed before starting the composite service. Useful for debugging dynamic configurations.
   */
  printConfig?: boolean

  /**
   * Description of the services to be composed.
   * Each entry represents a service, with the entry key as the service ID, and the entry value as the service configuration.
   * Entries with falsy values (i.e. no configuration) are discarded.
   * Must contain configuration for at least one service.
   */
  services: { [id: string]: ComposedServiceConfig | Falsy }
}

export type Falsy = false | null | undefined | 0 | ''

export interface ComposedServiceConfig {
  /**
   * Other composed services that this service depends on, referenced by ID.
   *
   * This service will not be started until all `dependencies` have started, and no `dependencies` will be stopped until this service has stopped.
   */
  dependencies?: string[]

  /**
   * Command used to run the service.
   * If it's a single string, it will be parsed into binary and arguments.
   * If it's an array of strings, the first element is the binary, and the remaining elements are the arguments.
   */
  command: string | string[]

  /**
   * Environment variables to pass to the service.
   *
   * No variables will be defined by default except `PATH`
   *
   * Beyond the control of this library, some additional variables may be defined depending on your OS.
   * For example, in Windows 10, nodejs child processes always have PATH, PATHEXT, WINDIR, etc., while in Linux,
   * nodejs child processes can actually have *no* environment variables if configured that way.
   * TODO: Can this be improved in nodejs? Or is this just an inherent fact/caveat about cross-platform compatibility?
   *
   * Tip: To propagate variables from the parent process, you can easily just include everything from `process.env`,
   * but you should consider passing each necessary variable *explicitly*, in order to maintain a clear picture
   * of which variables are used by which service.
   *
   * Example of propagating variables from the parent process:
   * ```js
   * const { PORT, NODE_ENV } = process.env
   * startCompositeProcess({
   *   services: [
   *     { env: { PORT, NODE_ENV }, ... },
   *     ...
   *   ],
   * })
   * ```
   *
   * Entries with value `undefined` are discarded.
   */
  env?: { [key: string]: string | number | undefined }

  /**
   * A function that returns a promise that resolves when the service has started up and is ready to do its job.
   * If the service serves over a tcp port, you can use the `oncePortUsed` helper here.
   * Defaults to `() => Promise.resolve()`
   */
  ready?: (ctx: ReadyConfigContext) => Promise<any>
}

export interface ReadyConfigContext {
  output: ReturnType<typeof mergeStream>
}

export interface NormalizedCompositeServiceConfig {
  printConfig: boolean
  services: { [id: string]: NormalizedComposedServiceConfig }
}

export interface NormalizedComposedServiceConfig {
  dependencies: string[]
  command: string[]
  env: { [key: string]: string }
  ready: (ctx: ReadyConfigContext) => Promise<any>
}

export function normalizeCompositeServiceConfig(
  config: CompositeServiceConfig
): NormalizedCompositeServiceConfig {
  // Let's do a lot of validation, since most scripts to implement composite server will NOT use TypeScript
  const _assert = (value: any, message: string) =>
    assert(value, `Invalid Config: ${message}`)
  const printConfig = Boolean(config.printConfig)
  const filteredServiceEntries = Object.entries(config.services).filter(
    ([, value]) => value
  ) as [string, ComposedServiceConfig][]
  const serviceIds = filteredServiceEntries.map(([id]) => id)
  const services = Object.fromEntries(
    filteredServiceEntries.map(([id, config]) => {
      const __assert = (value: any, message: string) =>
        _assert(value, `Service '${id}': ${message}`)
      const dependencies = config.dependencies || []
      __assert(Array.isArray(dependencies), `\`dependencies\` is not an array`)
      dependencies.forEach(dependency => {
        __assert(
          serviceIds.includes(dependency),
          `Dependency on nonexistent service '${dependency}'`
        )
      })
      let command =
        typeof config.command === 'string' // TODO: allow spaces in arguments of single-string commands
          ? config.command.split(/\s+/).filter(Boolean)
          : config.command
      __assert(
        Array.isArray(command),
        `\`command\` is not a string or an array`
      )
      command = command.map(part => {
        __assert(
          ['string', 'number'].includes(typeof part),
          `Command contains an element that is not string or number`
        )
        return String(part)
      })
      __assert(
        Array.isArray(command) &&
          command.every(part => typeof part === 'string'),
        `\`command\` is not a string or array of strings`
      )
      const env = Object.fromEntries(
        Object.entries(config.env || {})
          .filter(([, value]) => typeof value !== 'undefined')
          .map(([key, value]) => {
            __assert(
              ['string', 'number'].includes(typeof value),
              `Environment variable '${key}' is not string, number, or undefined`
            )
            return [key, String(value)]
          })
      )
      const ready = config.ready || (() => Promise.resolve())
      __assert(typeof ready === 'function', `\`ready\` is not a function`)
      return [id, { dependencies, command, env, ready }]
    })
  )
  Object.keys(services).forEach(serviceId => checkForCyclicDeps(serviceId))
  function checkForCyclicDeps(serviceId: string, path: string[] = []) {
    _assert(
      !path.includes(serviceId),
      `Found cyclic dependency ${path.join(' -> ')}`
    )
    for (const dep of services[serviceId].dependencies) {
      checkForCyclicDeps(dep, [...path, serviceId])
    }
  }
  _assert(Object.keys(services).length > 0, 'No configured service')
  return { printConfig, services }
}
