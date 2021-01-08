const KoaRouter = require('koa-router')

const contractRouters = new KoaRouter()

const { postRegistERC20TransferAction, postRegistMainAccountTransferAction } = require('../controller/registAction')

contractRouters.post('/regist/transfer/ant', postRegistERC20TransferAction)
contractRouters.post('/regist/transfer/account', postRegistMainAccountTransferAction)

module.exports = contractRouters