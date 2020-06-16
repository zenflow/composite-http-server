export function onceTimeout(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}
