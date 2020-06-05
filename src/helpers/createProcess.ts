import { spawn } from 'child_process'
import { Readable } from 'stream'
import { once } from 'events'
import mergeStream from 'merge-stream'
import splitStream from 'split'
import { mapStream } from './mapStream'

export function createProcess(command: string | Array<string>, env: object) {
  // TODO: allow spaces in arguments of single-string commands
  const [cmd, ...args] = Array.isArray(command)
    ? command
    : command.split(/\s+/).filter(Boolean)
  const proc = spawn(cmd, args, { env: { ...process.env, ...env } })
  const outputStream = (mergeStream(
    proc.stdout
      .setEncoding('utf8')
      .pipe(splitStream())
      .pipe(mapStream(line => `[out] ${line}\n`)),
    proc.stderr
      .setEncoding('utf8')
      .pipe(splitStream())
      .pipe(mapStream(line => `[ERR] ${line}\n`))
  ) as unknown) as Readable
  let didExit = false
  const exited = once(outputStream, 'end').then(() => {
    didExit = true
  })
  function kill(): Promise<void> {
    if (!didExit) {
      proc.kill('SIGINT')
    }
    return exited
  }
  return { outputStream, exited, kill }
}
