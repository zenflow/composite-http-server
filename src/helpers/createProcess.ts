import { spawn } from 'child_process'
import { Readable } from 'stream'
import { once } from 'events'
import mergeStream from 'merge-stream'
import splitStream from 'split'
import { mapStream } from './mapStream'
import { killProcessTree } from './killProcessTree'

export function createProcess(command: string | Array<string>, env: object) {
  const proc = Array.isArray(command)
    ? spawn(command[0], command.slice(1), {
        env: { ...process.env, ...env },
      })
    : spawn(command, {
        shell: true,
        env: { ...process.env, ...env },
      })
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
  let killPromise: Promise<void> | null = null
  function kill(): Promise<void> {
    if (!killPromise) {
      killPromise = Promise.resolve().then(async () => {
        if (!didExit) {
          await killProcessTree(proc.pid)
        }
        await exited
      })
    }
    return killPromise
  }
  return { outputStream, exited, kill }
}
