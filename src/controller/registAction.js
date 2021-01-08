const { ERC20Transfer, MainAccountTransfer } = require('../event/transfer')
const { PassThrough } = require("stream")

const postRegistERC20TransferAction = (ctx) => {
    const { body } = ctx.request
    if (!body.network) {
        ctx.status = 444
        return
    }

    ERC20Transfer.listener(body.network)

    ctx.request.socket.setTimeout(0)
    ctx.req.socket.setNoDelay(true)
    ctx.req.socket.setKeepAlive(true)

    ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    })

    const stream = new PassThrough()

    ctx.status = 200
    ctx.body = stream

    try {
        ERC20Transfer.eventEmitter.on('transfer', (error, data) => {
            if (error) return
            stream.write(JSON.stringify(data))
            stream.end()
        })
    }
    catch {
        return
    }
}

const postRegistMainAccountTransferAction = (ctx) => {
    const { body } = ctx.request
    if (!body.from || !body.network || !body.contractName || !body.contractAddr) {
        ctx.status = 444
        return
    }

    if (body.contractName === 'CUSTOM') MainAccountTransfer.listener(body.network, body.contractName, body.contractAddr)
    else MainAccountTransfer.listener(body.network, body.contractName)

    ctx.request.socket.setTimeout(0)
    ctx.req.socket.setNoDelay(true)
    ctx.req.socket.setKeepAlive(true)

    ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    })

    const stream = new PassThrough()

    ctx.status = 200
    ctx.body = stream

    try {
        MainAccountTransfer.eventEmitter.on('transfer', (error, data) => {
            if (error) return
            if (data.returnValues.from === body.from) {
                stream.write(JSON.stringify(data))
                stream.end()
            }
        })
    }
    catch {
        return
    }
}

module.exports = {
    postRegistERC20TransferAction,
    postRegistMainAccountTransferAction
}