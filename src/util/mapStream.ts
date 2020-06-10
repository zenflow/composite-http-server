import mapStreamAsync from 'map-stream'
import { Duplex } from 'stream'

export function mapStream(mapper: (arg0: string) => string): Duplex {
  return mapStreamAsync((string: string, cb: Function) =>
    cb(null, mapper(string))
  )
}
