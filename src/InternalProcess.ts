import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { once } from 'events'
import mergeStream from 'merge-stream'
import splitStream from 'split'

const split = () => splitStream((line: string) => `${line}\n`)

export class InternalProcess {
  private readonly child: ChildProcessWithoutNullStreams
  readonly output: ReturnType<typeof mergeStream>
  isEnded = false
  readonly ended: Promise<void>
  constructor(command: string[], env: { [key: string]: string }) {
    const { PATH } = process.env
    this.child = spawn(command[0], command.slice(1), {
      env: { PATH, ...env },
    })
    this.output = mergeStream(
      this.child.stdout.setEncoding('utf8').pipe(split()),
      this.child.stderr.setEncoding('utf8').pipe(split())
    )
    this.ended = once(this.output, 'end').then(() => {
      this.isEnded = true
    })
  }
  end() {
    if (!this.isEnded) {
      this.child.kill('SIGINT')
    }
    return this.ended
  }
}
