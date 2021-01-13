const Tx = require('ethereumjs-tx').Transaction
const Common = require('ethereumjs-common').default

const web3 = require('../module/web3')
const ABI = require('../constants/abi')
const contracts = require('../constants/contracts')
const { MainAccount } = require('../../config.json')
const config = require('../../config.json')

const chainId = require('../constants/chainId')

const network = 'heco'

const balance = async () => {
    const w3 = web3[network]
    const contractAddress = '0x68a0a1fef18dfcc422db8be6f0f486dea1999edc'

    const contract = new w3.eth.Contract(ABI.ANT, '0x68a0a1fef18dfcc422db8be6f0f486dea1999edc')

    // const balance = await contract.methods.balanceOf(MainAccount).call()
    // console.log(balance)

    const symbol = await contract.methods.symbol().call()
    console.log(symbol)
    const name = await contract.methods.name().call()
    console.log(name)
    
}

balance()