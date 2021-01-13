const Tx = require('ethereumjs-tx').Transaction
const Common = require('ethereumjs-common').default

const web3 = require('../module/web3')
const ABI = require('../constants/abi')
const contracts = require('../constants/contracts')
const { MainAccount } = require('../../config.json')
const config = require('../../config.json')
const Store = require('../store/store')
const { getChainForEthereumjsTx } = require('../lib/chainConfig')

const chainId = require('../constants/chainId')

const addMinter = async (network, account, accountKey) => {
    const w3 = web3[network]
    const contractAddress = contracts[network].ANT

    const contract = new w3.eth.Contract(ABI.ANT, contractAddress)
    const count = await w3.eth.getTransactionCount(account)

    const gasPricePre = await await w3.eth.getGasPrice()
    const gasPrice = w3.utils.toHex(gasPricePre)

    let rawTransaction = {
        "from": account,
        "nonce": count,
        "gasPrice": gasPrice,
        "gasLimit": 5000000,
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.addMinter(MainAccount).encodeABI(),
        "chainId": w3.utils.toHex(chainId[network])
    }

    const privKey = Buffer.from(accountKey, 'hex')
    const customCommon = getChainForEthereumjsTx(network)
    let tx = new Tx(rawTransaction, { common: customCommon })

    tx.sign(privKey)
    const serializedTx = tx.serialize()

    let receipt = {}
    try {
        receipt = await w3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
            if (!err) {
                console.log(hash)
            }
            else
                console.log(err)
        })
    }
    catch (e) {
        console.log(e)
    }
    console.log(receipt)
    return receipt
}

const transfer = async (network, contractName, to, amount, id) => {
    console.log('mint on network: ', network)
    console.log(network, contractName, to, amount)

    const w3 = web3[network]
    const contractAddress = contracts['heco']['ANT']

    const contract = new w3.eth.Contract(ABI['ANT'], contractAddress)

    console.log(MainAccount, contractAddress)
    const allowance = await contract.methods.allowance(MainAccount, contractAddress).call()
    console.log('授权金额', allowance)
    
    try {
        await approve(network, contractName, amount)
    }
    catch (e) {
        console.log('line 75', e)
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed Because Relay Account has No Balance' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1006 } }, {})
        return
    }
    // await approve(network, contractName, amount)
    if (allowance.length < amount.split('').length) {
        try {
            await increaseAllowance(network, contractName, amount)
            await increaseAllowance(network, contractName, amount)
        }
        catch (e) {
            console.log('line 90', e)

            await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed Because Relay Account has No Balance' } }, {})
            await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
            await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1006 } }, {})
            return
        }
    }

    const etherBalance = await web3[network].eth.getBalance(MainAccount)
    if (etherBalance === '0') {
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed Because Relay Account has No Balance' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1006 } }, {})
        return
    }

    const balance = await contract.methods.balanceOf(MainAccount).call()
    if (balance === '0') {
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed Because Relay Account has No Balance' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
        Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1006 } }, {})
        return
    }

    const count = await w3.eth.getTransactionCount(MainAccount)
    const gasPricePre = await web3[network].eth.getGasPrice()
    const gasPrice = web3[network].utils.toHex(gasPricePre)
    const gasLimit = await contract.methods.transfer(to, amount + '').estimateGas({ from: MainAccount, gasPrice: gasPrice })

    let rawTransaction = {
        "from": MainAccount,
        "nonce": count,
        "gasPrice": "0x04e3b29200",
        "gasLimit": gasLimit,
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.transfer(to, amount + '').encodeABI(),
        "chainId": 0x03
    }

    const privKey = Buffer.from(config.MainAccountKey, 'hex')
    const customCommon = getChainForEthereumjsTx(network)
    let tx
    try {
        tx = new Tx(rawTransaction, customCommon)
    }
    catch (txErrore) {
        console.log('line 143', txError)

        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction Creation Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1006 } }, {})

        return
    }

    tx.sign(privKey)
    const serializedTx = tx.serialize()

    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction Signed' } }, {})
    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Pending' } }, {})
    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1006 } }, {})
    let receipt = {}
    try {
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction Sent, Waiting for Confirmation' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Pending' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1007 } }, {})

        receipt = await w3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
    }
    catch (e) {
        console.log('line 167', e)

        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Sending Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Failed' } }, {})
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: -1007 } }, {})
        return
    }

    console.log(receipt)
    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { message: 'Transaction Recieved, Transaction Confirmed' } }, {})
    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { status: 'Success' } }, {})
    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { code: 1009 } }, {})
    await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { outcomeData: JSON.stringify(receipt) } }, {})

    setTimeout(async () => {
        await Store.main.update({ key: 'TransferStatus', id: id }, { $set: { activeStatus: 'Passed' } }, {})
    })
}

const increaseAllowance = async (network, contractName, amount) => {
    console.log(network, contractName, amount)
    const w3 = web3[network]
    const contractAddress = contracts[network][contractName]

    const contract = new w3.eth.Contract(ABI[contractName], contractAddress)
    const count = await w3.eth.getTransactionCount(MainAccount)

    const increaseAllowanceGasPricePre = await await web3[network].eth.getGasPrice()
    const increaseAllowanceGasPrice = web3[network].utils.toHex(increaseAllowanceGasPricePre)
    const increaseAllowanceGasLimit = await contract.methods.increaseAllowance(contractAddress, amount + '').estimateGas({ from: MainAccount, gasPrice: increaseAllowanceGasPrice })

    let increaseAllowanceRawTransaction = {
        "from": MainAccount,
        "nonce": count,
        "gasPrice": "0x04e3b29200",
        "gasLimit": increaseAllowanceGasLimit,
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.increaseAllowance(contractAddress, amount + '').encodeABI(),
        "chainId": 0x03
    }

    const privKey = Buffer.from(config.MainAccountKey, 'hex')
    const customCommon = getChainForEthereumjsTx(network)
    let tx = new Tx(increaseAllowanceRawTransaction, customCommon)

    tx.sign(privKey)
    const serializedTx = tx.serialize()

    let receipt = {}
    try {
        receipt = await w3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
            if (!err) {
                console.log(hash)
            }
            else
                console.log(err)
        })
    }
    catch (e) {
        console.log(e)
    }
    console.log(receipt)
}

const approve = async (network, contractName, amount) => {
    console.log(network, contractName, amount)
    const w3 = web3[network]
    const contractAddress = contracts[network][contractName]
    console.log(contractAddress)

    const contract = new w3.eth.Contract(ABI[contractName], contractAddress)
    const count = await w3.eth.getTransactionCount(MainAccount)

    const gasPricePre = await await web3[network].eth.getGasPrice()
    const gasPrice = web3[network].utils.toHex(gasPricePre)
    const gasLimit = await contract.methods.approve(contractAddress, amount + '').estimateGas({ from: MainAccount, gasPrice: gasPrice })

    let increaseAllowanceRawTransaction = {
        "from": MainAccount,
        "nonce": count,
        "gasPrice": "0x04e3b29200",
        "gasLimit": gasLimit,
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.approve(contractAddress, amount + '').encodeABI(),
        "chainId": 0x03
    }

    const privKey = Buffer.from(config.MainAccountKey, 'hex')
    const customCommon = getChainForEthereumjsTx(network)
    let tx = new Tx(increaseAllowanceRawTransaction, customCommon)

    tx.sign(privKey)
    const serializedTx = tx.serialize()

    let receipt = {}
    try {
        receipt = await w3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) {
            if (!err) {
                console.log(hash)
            }
            else
                console.log(err)
        })
    }
    catch (e) {
        console.log(e)
    }
    console.log(receipt)
}

module.exports = {
    transfer
}