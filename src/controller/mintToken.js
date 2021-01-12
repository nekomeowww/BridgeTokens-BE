const Tx = require('ethereumjs-tx').Transaction
const Common = require('ethereumjs-common').default

const web3 = require('../module/web3')
const ABI = require('../constants/abi')
const contracts = require('../constants/contracts')
const { MainAccount } = require('../../config.json')
const config = require('../../config.json')

const chainId = require('../constants/chainId')

const network = 'heco'

const customCommon = Common.forCustomChain (
    'mainnet',
    {
      name: 'HEC-Main',
      networkId: chainId[network],
      chainId: chainId[network],
    },
    'petersburg',
  )

const addMinter = async (account, accountKey) => {
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

const mint = async () => {
    console.log('mint on network: ', network)

    const w3 = web3[network]
    const contractAddress = contracts[network].ANT

    const contract = new w3.eth.Contract(ABI.ANT, contractAddress)

    const isMinter = await contract.methods.minters(MainAccount).call()

    if (!isMinter) {
        await addMinter(config.AdminAccount, config.AdminAccountKey)
    }

    const count = await w3.eth.getTransactionCount(MainAccount)

    const gasPricePre = await await w3.eth.getGasPrice()
    const gasPrice = w3.utils.toHex(gasPricePre)

    // const gasLimit = await contract.methods.mint(MainAccount, 1000000 + '').estimateGas({ from: MainAccount, gasPrice: gasPricePre })

    let rawTransaction = {
        "from": MainAccount,
        "nonce": count,
        "gasPrice": gasPrice,
        "gasLimit": 5000000,
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.mint(MainAccount, 1000000 + '').encodeABI(),
        "chainId": w3.utils.toHex(chainId[network])
    }

    const privKey = Buffer.from(config.MainAccountKey, 'hex')
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
}

module.exports = {
    mint
}