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

const MainAccount = config.MainAccount

const transferOutFromMainAccount = async (data) => {
    const { ctx, id } = data
    const { body } = ctx.request

    if (body.contractName === 'CUSTOM') MainAccountTransfer.listener(body.target, body.network, body.contractName, body.contractAddr)
    else MainAccountTransfer.listener(body.target, body.network, body.contractName)

    function onEvent(eventName) {
        return new Promise((resolve, reject) => {
            MainAccountTransfer.eventEmitter.on(eventName, async (error, tx) => {
                if (error) reject(error)

                try {
                    const receipt = await web3[body.network].eth.getTransactionReceipt(tx.transactionHash)
                    if (!receipt.status) {
                        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed With Contract Execution Fail' } }, {})
                        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1002 } }, {})

                        MainAccountTransfer.delete()
                        return
                    }
                }
                catch (e) {
                    console.log(e)

                    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed While Verifying Transaction Data' } }, {})
                    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1003 } }, {})

                    MainAccountTransfer.delete()
                    return
                }

                let inputs = []
                try {
                    if (body.contractName === 'CUSTOM') inputs = new ethers.utils.Interface(ABI['ERC20'])
                    else inputs = new ethers.utils.Interface(ABI[body.contractName])

                    const decodedInput = inputs.parseTransaction({ data: tx.input, value: tx.value})

                    // Decoded Transaction
                    const dataObj = {
                        function_name: decodedInput.name,
                        from: tx.from,
                        to: decodedInput.args[0],
                        value: (decodedInput.args[1]).toString()
                    }

                    console.log(dataObj)
                    if (dataObj.from === body.target && dataObj.value === body.amount + '' && dataObj.to === MainAccount) {
                        resolve(tx)
                        MainAccountTransfer.delete()
                    }
                }
                catch (e) {
                    console.log(e)

                    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed While Parsing Transaction' } }, {})
                    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1001 } }, {})

                    MainAccountTransfer.delete()
                    return
                }
            })
        })
    }

    try {
        const transferData = await onEvent('transfer')
        MainAccountTransfer.delete()
        console.log('已检测到交易：', transferData)

        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Pending on transfer out' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1004 } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { incomeData: JSON.stringify(transferData) } }, {})
    }
    catch (e) {
        console.log(e)
        MainAccountTransfer.delete()

        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1005 } }, {})

        return
    }

    MainAccountTransfer.delete()
    console.log('received tx, preparing sending back...')
    console.log('transfering network from: ', body.targetNetwork)

    const count = await web3[body.targetNetwork].eth.getTransactionCount(MainAccount)
    const contractAddress = contracts[body.targetNetwork][body.contractName]

    let contract = {}
    if (body.contractName === 'CUSTOM') {
        contract = new web3[body.targetNetwork].eth.Contract(ABI['ERC20'], contractAddr)
    }
    else contract = new web3[body.targetNetwork].eth.Contract(ABI[body.contractName], contracts[body.targetNetwork][body.contractName])

    const balance = await contract.methods.balanceOf(MainAccount).call()
    if (balance < 0) {
        ctx.body = { code: -5, message: 'Relay Account has No Balance on' + contractAddress || 'Relay Account has No Balance on' + contractAddr }

        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed Because Relay Account has No Balance' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1006 } }, {})
    }

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

    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction created' } }, {})
    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1005 } }, {})

    const privKey = Buffer.from(config.MainAccountKey, 'hex')
    let tx = new Tx(rawTransaction, { 'chain': body.network })

    tx.sign(privKey)
    const serializedTx = tx.serialize()

    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction signed' } }, {})
    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1006 } }, {})

    let receipt = {}
    try {
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction sent' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1007 } }, {})
        
        receipt = await web3[body.targetNetwork].eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
            if (!err) {
                Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction Confirmed' } }, {})
                Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1008 } }, {})
            }
            else
                Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed' } }, {})
                Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1007 } }, {})
        })
    }
    catch (e) {
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1007 } }, {})
        return
    }

    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction Confirmed' } }, {})
    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1009 } }, {})
    Store.main.update({ key: 'TransferStatus', id: id }, { $set: { outcomeData: JSON.stringify(receipt) } }, {})

    setTimeout(async () => {
        await Store.main.remove({ key: 'TransferStatus', id: id }, {})
    })
}

module.exports = {
    transferOutFromMainAccount
}