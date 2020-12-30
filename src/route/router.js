const KoaRouter = require('koa-router')

let routers = new KoaRouter()

const { getInfo } = require('../controller/appInfo')

let contract = require('../api/contract')

routers.get("/", getInfo)
routers.use("/contract", contract.routes(), contract.allowedMethods())

module.exports = routers