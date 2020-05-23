import connect, { HandleFunction } from 'connect'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { NormalizedCompositeServerConfig } from './config'

const config: NormalizedCompositeServerConfig = JSON.parse(
  process.env.HTTP_SERVER_GROUP_CONFIG as string
)

const app = connect()

config.servers
  .filter(serverConfig => serverConfig.httpProxyPaths.length > 0)
  .map(serverConfig =>
    createProxyMiddleware(serverConfig.httpProxyPaths, {
      logLevel: 'warn',
      ...config.httpProxyOptions,
      ...serverConfig.httpProxyOptions,
      target: `http://${serverConfig.host}:${serverConfig.port}`,
    })
  )
  .forEach(middleware => app.use(middleware as HandleFunction))

app.listen(process.env.PORT as string)
