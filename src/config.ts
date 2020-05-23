import { Options as HttpProxyOptions } from 'http-proxy-middleware'
import { assert } from './helpers'

export { HttpProxyOptions }

export interface CompositeServerConfig {
  printConfig?: boolean
  defaultPort?: number
  httpProxyOptions?: HttpProxyOptions
  servers: (ConstituentServerConfig | Falsy)[]
}

export type Falsy = false | null | undefined

export interface ConstituentServerConfig {
  label?: string
  env?: object
  command: string | string[]
  host?: string
  port: number
  httpProxyPaths?: string[]
  httpProxyOptions?: HttpProxyOptions
}

export interface NormalizedCompositeServerConfig {
  printConfig: boolean
  defaultPort: number
  httpProxyOptions: HttpProxyOptions
  servers: NormalizedConstituentServerConfig[]
}

export interface NormalizedConstituentServerConfig {
  label: string
  env: object
  command: string | string[]
  host: string
  port: number
  httpProxyPaths: string[]
  httpProxyOptions: HttpProxyOptions
}

export function validateAndNormalizeConfig(
  config: CompositeServerConfig
): NormalizedCompositeServerConfig {
  const printConfig = config.printConfig ?? false
  const defaultPort = config.defaultPort ?? 3000
  const httpProxyOptions = config.httpProxyOptions ?? {}
  const filteredServers = config.servers.filter(
    Boolean
  ) as ConstituentServerConfig[]
  const servers = filteredServers.map(
    (server: ConstituentServerConfig, index) => {
      const {
        label = String(index + 1),
        env = {},
        command,
        host = 'localhost',
        port,
        httpProxyPaths = [],
      } = server
      assert(command, `Server '${label}' is missing \`command\``)
      assert(port, `Server '${label}' is missing \`port\``)
      assert(
        httpProxyPaths.every(path => path[0] === '/'),
        `Server '${label}' has some path(s) that are not absolute`
      )
      const httpProxyOptions = { ...(server.httpProxyOptions ?? {}) }
      for (const forbiddenProxyOption of ['router', 'target']) {
        if (forbiddenProxyOption in httpProxyOptions) {
          console.warn(
            `Warning: Ignoring \`httpProxyOptions.${forbiddenProxyOption}\` for server '${label}'`
          )
          delete (httpProxyOptions as any)[forbiddenProxyOption]
        }
      }
      return {
        label,
        env,
        command,
        host,
        port,
        httpProxyPaths,
        httpProxyOptions,
      }
    }
  )
  assert(servers.length > 0, 'Must specify at least one server')
  return { printConfig, defaultPort, httpProxyOptions, servers }
}
