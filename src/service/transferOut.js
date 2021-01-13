const ethers = require('ethers')
const Tx = require('ethereumjs-tx').Transaction

const web3 = require('../module/web3')
const Store = require('../store/store')
const ABI = require('../constants/abi')
const config = require('../../config.json')
const contracts = require('../constants/contracts')
const { MainAccountTransfer } = require('../event/transfer')

const { transfer } = require('../controller/mintToken')

const MainAccount = config.MainAccount

const transferOutFromMainAccount = async (data) => {
    const { ctx, id } = data
    const { body } = ctx.request

    function onEvent(eventName) {
        return new Promise((resolve, reject) => {
            MainAccountTransfer.eventEmitter.on(eventName, async (error, tx) => {
                if (error) reject(error)

                try {
                    const receipt = await web3[body.network].eth.getTransactionReceipt(tx.hash)
                    if (!receipt.status) {
                        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed With Contract Execution Fail' } }, {})
                        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
                        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1002 } }, {})

                        MainAccountTransfer.delete()
                        return
                    }
                }
                catch (e) {
                    console.log(e)

                    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed While Parsing Transaction Receipt Data' } }, {})
                    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
                    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1003 } }, {})

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

                    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed While Parsing Transaction' } }, {})
                    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
                    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1001 } }, {})

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

        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Pending on transfer out' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Pending' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1004 } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { incomeData: JSON.stringify(transferData) } }, {})
    }
    catch (e) {
        console.log(e)
        MainAccountTransfer.delete()

        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieve Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1005 } }, {})

        return
    }

    MainAccountTransfer.delete()
    console.log('received tx, preparing sending back...')
    console.log('transfering network from: ', body.targetNetwork)

    transfer(body.targetNetwork, body.contractName, body.target, body.amount, id)
}

module.exports = {
    transferOutFromMainAccount
}