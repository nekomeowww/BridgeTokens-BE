const ethers = require('ethers')
const Tx = require('ethereumjs-tx').Transaction

const Hash = require('../util/hash')
const web3 = require('../module/web3')
const Store = require('../store/store')
const ABI = require('../constants/abi')
const { PassThrough } = require('stream')
const config = require('../../config.json')
const { SSEStream } = require('../lib/stream')
const contracts = require('../constants/contracts')
const { ERC20Transfer, MainAccountTransfer } = require('../event/transfer')
const { transferOutFromMainAccount } = require('../service/transferOut')

const MainAccount = config.MainAccount

const postRegistERC20TransferAction = async (ctx) => {
    const { body } = ctx.request
    if (!body.target || !body.network) {
        ctx.status = 444
        return
    }
    else if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.target))) {
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

    const stream = new SSEStream()

    ctx.status = 200
    ctx.body = stream

    try {
        ERC20Transfer.eventEmitter.on('transfer', (error, data) => {
            if (error) return

            if (data.returnValues.from === body.target) {
                const id = Hash.sha256(Date.now() + '').substring(0, 16)

                Store.main.insert({ key: 'TransferAction', id: id, data: JSON.stringify(data) })

                stream.write(JSON.stringify({ id: id, data: JSON.stringify(data) }))

                stream.write(JSON.stringify(data))
                stream.end()
            }
        })
    }
    catch {
        return
    }
}

const postRegistMainAccountTransferAction = async (ctx) => {
    const { body } = ctx.request
    if (!body.target || !body.amount || !body.network || !body.targetNetwork || !body.contractName || !body.contractAddr || !body.targetContractAddr || !body.fee) {
        ctx.status = 444
        return
    }
    else if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.target))) { 
        ctx.status = 444
        return
    }
    else if (body.contractName === 'CUSTOM') {
        if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.contractAddr))) {
            ctx.status = 444
            return
        }
        else if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.targetContractAddr))) {
            ctx.status = 444
            return
        }
    }

    // 如果 web3 不包含指定的 本地网络 以及 不包含指定的 目标网络，则错误
    if (!web3.hasOwnProperty(body.network) && !web3.hasOwnProperty(body.targetNetwork)) {
        ctx.body = { code: -1, message: 'Network Not Supported', error: 'Network Not Supported' }
        return
    }
    // 如果有指定 预设合约名称，然而合约预设中不包含该预设名字，则错误
    if (body.contractName && !(contracts[body.network].hasOwnProperty(body.contractName) && contracts[body.targetNetwork].hasOwnProperty(body.contractName))) {
        ctx.body = { code: -2, message: 'Contract is Not Included in Preset', error: 'Contract is Not Included in Preset' }
        return
    }
    // 如果合约预设不包含指定的 本地网络 以及 不包含指定的 目标网络，则错误
    if (!contracts.hasOwnProperty(body.network) && !contracts.hasOwnProperty(body.targetNetwork)) {
        ctx.body = { code: -3, message: 'Contract is Not Deployed in Network(s)', error: 'Contract is Not Deployed in Network(s)' }
        return
    }
    // 如果合约预设在本地网络中不包含指定的 预设合约名称 以及 合约预设在目标网络中不包含指定的 预设合约名称
    if (!contracts[body.network].hasOwnProperty(body.contractName) && !contracts[body.targetNetwork].hasOwnProperty(body.contractName)) {
        ctx.body = { code: -4, message: 'Contract is Not Included in Network(s)', error: 'Contract is Not Included in Network(s)' }
        return
    }

    console.log('checking network on: ', body.network)
    console.log(body)

    ctx.request.socket.setTimeout(0)
    ctx.req.socket.setNoDelay(true)
    ctx.req.socket.setKeepAlive(true)

    ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    })

    const id = Hash.sha256(Date.now() + '').substring(0, 16)

    const to = body.contractName === 'CUSTOM' ? body.contractAddr : contracts[body.targetNetwork][body.contractName]
    
    const check = await Store.main.findOne({ key: 'TransferStatus', id: id, active: 'Active'})
    if (check) {
        ctx.status = 200
        ctx.body = stream

        stream.write(JSON.stringify({ code: -1, data: id, message: 'You Still have an Active Transaction Pending, Please Try Again after 5 Minutes' }))
        stream.end()
        return
    }
    await Store.main.insert({ key: 'TransferStatus', id: id, message: 'Pending on check', code: 1000, incomeData: {}, outcomeData: {}, from: body.target, to: to, status: 'Pending', activeStatus: 'Active' })

    const stream = new PassThrough()
    ctx.status = 200
    ctx.body = stream

    stream.write(JSON.stringify({ code: 0, data: id }))
    stream.end()

    if (body.contractName === 'CUSTOM') MainAccountTransfer.listener(body.contractAddr, body.network, id)
    else MainAccountTransfer.listener(contracts[body.network][body.contractName], body.network, id)
    console.log(contracts[body.network][body.contractName], body.network, id)

    transferOutFromMainAccount({ ctx: ctx, id: id })

    setTimeout(() => {
        Store.main.findOne({ key: 'TransferStatus', id: id }, { $set: { activeStatus: 'Passed' } })
    }, 120000)
}

module.exports = {
    postRegistERC20TransferAction,
    postRegistMainAccountTransferAction
}