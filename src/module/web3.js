const Web3 = require('web3')
const config = require('../../config.json')

let web3 = {
    rinkeby: new Web3(new Web3.providers.WebsocketProvider(config.RPCs.rinkeby)),
    ropsten: new Web3(new Web3.providers.WebsocketProvider(config.RPCs.ropsten)),
    binance: new Web3(new Web3.providers.HttpProvider(config.RPCs.binance)),
    binanceTest: new Web3(new Web3.providers.HttpProvider(config.RPCs.binanceTest)),
    heco: new Web3(new Web3.providers.HttpProvider(config.RPCs.heco)),
    hecoTest: new Web3(new Web3.providers.HttpProvider(config.RPCs.hecoTest)),
}

exports.ethEnabled = async () => {
    // @ts-ignore
    if (window.ethereum) {
        // @ts-ignore
        await window.ethereum.enable()
        return true
    }
    return false
}

module.exports = web3