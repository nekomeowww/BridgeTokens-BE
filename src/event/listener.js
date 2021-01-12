const web3 = require('../module/web3')
const ABI = require('../constants/abi')
const contracts = require('../constants/contracts')

const transferEvent = require('../event/transfer')

const EventListener = () => {
    // transferEvent.ERC20Transfer.listener()
    // transferEvent.MainAccountTransfer.listener()

    // for ([network, contractObj] of Object.entries(contracts)) {
    //     for ([contractName, contractAddress] of Object.entries(contractObj)) {
    //         transferEvent.MainAccountTransfer.listener(contractAddress, network)
    //     }
    // }
}

module.exports = EventListener