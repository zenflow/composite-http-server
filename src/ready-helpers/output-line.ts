import mergeStream from 'merge-stream'

export function onceOutputLine(
  output: ReturnType<typeof mergeStream>,
  test: (line: string) => boolean
): Promise<void> {
  return new Promise(resolve => {
    output.on('data', line => {
      if (test(line)) resolve()
    })
  })
}

export function onceOutputLineIs(
  output: ReturnType<typeof mergeStream>,
  value: string
): Promise<void> {
  return onceOutputLine(output, line => line === value)
}

export function onceOutputLineIncludes(
  output: ReturnType<typeof mergeStream>,
  value: string
): Promise<void> {
  return onceOutputLine(output, line => line.includes(value))
}
