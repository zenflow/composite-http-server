import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { once } from 'events'
import mergeStream from 'merge-stream'
import splitStream from 'split'

const split = () => splitStream((line: string) => `${line}\n`)

export class InternalProcess {
  readonly output: ReturnType<typeof mergeStream>
  readonly started: Promise<void>
  readonly ended: Promise<void>
  isEnded = false
  private readonly child: ChildProcessWithoutNullStreams
  constructor(command: string[], env: { [key: string]: string }) {
    const { PATH } = process.env
    this.child = spawn(command[0], command.slice(1), {
      env: { PATH, ...env },
    })
    this.output = mergeStream(
      this.child.stdout.setEncoding('utf8').pipe(split()),
      this.child.stderr.setEncoding('utf8').pipe(split())
    )
    const error = new Promise((_, reject) =>
      this.child.on('error', error => reject(error))
    )
    this.started = Promise.race([
      error,
      new Promise(resolve => setTimeout(resolve, 100)),
    ]).then(() => {})
    this.ended = Promise.race([
      error.catch(() => {}),
      once(this.output, 'end'),
    ]).then(() => {
      this.isEnded = true
    })
  }
  end() {
    this.child.kill('SIGINT')
    return this.ended
  }
}
