import treeKill from 'tree-kill'

export function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve, reject) =>
    treeKill(pid, 'SIGINT', error => (error ? reject(error) : resolve()))
  )
}
