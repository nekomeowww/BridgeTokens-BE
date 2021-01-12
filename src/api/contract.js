const KoaRouter = require('koa-router')

const { SSEStream, updateStream } = require('../lib/stream')

const contractRouters = new KoaRouter()

const { postRegistERC20TransferAction, postRegistMainAccountTransferAction } = require('../controller/registAction')
const { postConfirmERC20TransferAction, postConfirmMainAccountTransferAction } = require('../controller/confirmBridgeAction')
const { getStatusMainAccountTransferAction } = require('../controller/statusEvent')

contractRouters.use(async (ctx, next) => {
    const stream = new SSEStream()
    ctx.SSEStream = stream
    await next()
})

contractRouters.post('/regist/transfer/erc20', postRegistERC20TransferAction)
contractRouters.post('/regist/transfer/account', postRegistMainAccountTransferAction)
contractRouters.post('/confirm/transfer/erc20', postConfirmERC20TransferAction)
contractRouters.post('/confirm/transfer/account', postConfirmMainAccountTransferAction)
contractRouters.get('/status', getStatusMainAccountTransferAction)

module.exports = contractRouters