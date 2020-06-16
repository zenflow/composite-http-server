import serializeJavascript from 'serialize-javascript'
import {
  Options as HttpProxyMiddlewareOptions,
  Filter as HttpProxyMiddlewareContext,
} from 'http-proxy-middleware'
import { ComposedServiceConfig, NormalizedComposedServiceConfig } from '../core'
import { onceOutputLineIncludes } from '../ready-helpers'

export type HttpProxyServiceConfig = {
  host?: string
  port: number | string
  proxies: (HttpProxyConfig | null | undefined)[]
} & Pick<ComposedServiceConfig, 'dependencies'>

export type HttpProxyConfig = {
  context: HttpProxyMiddlewareContext
} & HttpProxyMiddlewareOptions

export function configureHttpProxyService(
  config: HttpProxyServiceConfig
): NormalizedComposedServiceConfig {
  // TODO: validate `config.port` & `config.proxies`
  const proxies = config.proxies.filter(Boolean)
  return {
    dependencies: config.dependencies || [],
    command: ['node', `${__dirname}/http-proxy-server.js`],
    env: {
      HOST: config.host || '0.0.0.0',
      PORT: String(config.port),
      PROXIES: serializeJavascript(proxies, { unsafe: true }),
    },
    ready: ctx => onceOutputLineIncludes(ctx.output, 'Listening @ http://'),
  }
}
