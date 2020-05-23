export function rightPad(string: string, length: number): string {
  let result = string
  while (result.length < length) {
    result += ' '
  }
  return result
}
