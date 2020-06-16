import { once } from 'events'
import connect, { HandleFunction } from 'connect'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { HttpProxyConfig } from './configure'

const app = connect()

// eslint-disable-next-line no-eval
const proxies: HttpProxyConfig[] = eval(process.env.PROXIES as string)
for (const { context, ...options } of proxies) {
  const middleware = createProxyMiddleware(context, options)
  app.use(middleware as HandleFunction)
}

const host = process.env.HOST
const port = parseInt(process.env.PORT as string, 10)
const server = app.listen(port, host)
once(server, 'listening').then(() => {
  console.log(`Listening @ http://${host}:${port}`)
})
