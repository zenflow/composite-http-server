const { startCompositeServer } = require('../..')

startCompositeServer(JSON.parse(process.env.CONFIG))
