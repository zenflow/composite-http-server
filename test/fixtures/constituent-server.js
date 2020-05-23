const { createServer } = require('http')

const server = createServer((_, res) => {
  res.write(process.env.RESPONSE_TEXT || '')
  res.end()
})

if (process.env.EXIT_PRE_START) {
  exit()
} else {
  const delay = Number.parseInt(process.env.START_DELAY || '0', 10)
  wait(delay).then(() => {
    server.listen(process.env.PORT, error => {
      if (error) throw error
      console.log('Started 🚀') // ensures unicode characters work in console output
      if (process.env.EXIT_POST_START) {
        exit()
      }
    })
  })
}

function exit() {
  const delay = Number.parseInt(process.env.EXIT_DELAY || '0', 10)
  wait(delay).then(() => process.exit(1))
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
