const { createServer } = require('http')
const { runService } = require('./helpers')

const server = createServer((_, res) => {
  res.write(process.env.RESPONSE_TEXT || '')
  res.end()
})

runService(
  () =>
    new Promise((resolve, reject) => {
      server.listen(process.env.PORT, error => {
        if (error) reject(error)
        else resolve()
      })
    })
)
