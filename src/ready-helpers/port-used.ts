import { check as isPortUsed, waitUntilUsedOnHost } from 'tcp-port-used'
import { assert } from '../util'

export async function oncePortUsed(port: number | string, host = 'localhost') {
  const portNumber = typeof port === 'number' ? port : parseInt(port, 10)
  assert(
    !(await isPortUsed(portNumber)),
    `oncePortUsed: Port ${portNumber} is already in use`
  )
  await waitUntilUsedOnHost(portNumber, host, 250, 2147483647)
}
