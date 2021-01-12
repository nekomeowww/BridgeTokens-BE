const Tx = require('ethereumjs-tx').Transaction

const Hash = require('../util/hash')
const web3 = require('../module/web3')
const Store = require('../store/store')
const ABI = require('../constants/abi')
const config = require('../../config.json')
const { StreamMap, updateStream, SSEStream } = require('../lib/stream')
const contracts = require('../constants/contracts')
const { ERC20Transfer, MainAccountTransfer } = require('../event/transfer')

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
    if (!body.target || !body.amount || !body.network || !body.targetNetwork || !body.contractName || !body.contractAddr || !body.targetContractAddr) {
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

    const stream = new SSEStream()
    const streamId = Hash.sha256(Date.now() + '').substring(0, 16)
    Store.main.insert({ key: 'StreamInstance', id: streamId })
    StreamMap.set(streamId, stream)

    ctx.status = 200
    ctx.body = ctx.stream

    function onEvent(eventName) {
        return new Promise((resolve, reject) => {
            MainAccountTransfer.eventEmitter.on(eventName, (error, data) => {
                if (error) reject(error)
                if (data.returnValues.from === body.target && data.returnValues.value === body.amount + '') {
                    resolve(data)
                }
            })
        })
    }

    try {
        const transferData = await onEvent('transfer')
        console.log(transferData)
        const id = Hash.sha256(Date.now() + '').substring(0, 16)
    
        Store.main.insert({ key: 'TransferAction', id: id, data: JSON.stringify(transferData) })

        stream.write(JSON.stringify({ code: 0, id: id, data: JSON.stringify(transferData) }))
        stream.end()
    }
    catch (e) {
        console.log(e)
        MainAccountTransfer.delete()
        return
    }

    MainAccountTransfer.delete()
    console.log('received tx, preparing sending back...')

    const count = await web3[body.targetNetwork].eth.getTransactionCount(MainAccount)
    const contractAddress = contracts[body.targetNetwork][body.contractName]

    let contract = {}
    if (body.contractName === 'CUSTOM') {
        contract = new web3[body.targetNetwork].eth.Contract(ABI['ERC20'], contractAddr)
    }
    else contract = new web3[body.targetNetwork].eth.Contract(ABI[body.contractName], contracts[body.targetNetwork][body.contractName])

    const gasPricePre = await await web3[body.targetNetwork].eth.getGasPrice()
    const gasPrice = web3[body.targetNetwork].utils.toHex(gasPricePre)
    const gasLimit = await contract.methods.transfer(body.target, body.amount + '').estimateGas({ from: MainAccount, gasPrice: gasPrice })

    let rawTransaction = {
        "from": MainAccount,
        "nonce": count,
        "gasPrice": "0x04e3b29200",
        "gasLimit": gasLimit,
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.transfer(body.target, body.amount + '').encodeABI(),
        "chainId": 0x03
    }

    const privKey = Buffer.from(config.MainAccountKey, 'hex')
    let tx = new Tx(rawTransaction, { 'chain': body.network })

    tx.sign(privKey)
    const serializedTx = tx.serialize()

    let receipt = {}
    try {
        receipt = await web3[body.targetNetwork].eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
            if (!err) {
                stream.write(JSON.stringify({ code: 0, message: 'Transaction Sent', data: hash }))
                stream.end()
            }
            else
                stream.write(JSON.stringify({ code: 1, message: 'Transaction Sending Errored', data: hash }))
                stream.end()
        })
    }
    catch (e) {
        stream.write(JSON.stringify({ code: 1, message: 'Transaction Errored', data: JSON.stringify(e) }))
        stream.end()
    }

    stream.write(JSON.stringify({ code: 0, message: 'Transaction Confirmed', data: JSON.stringify(receipt) }))
    stream.end()
}

module.exports = {
    postRegistERC20TransferAction,
    postRegistMainAccountTransferAction
}