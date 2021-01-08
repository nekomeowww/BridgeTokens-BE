const Web3 = require('web3')
const config = require('../../config.json')

let web3 = {
    rinkeby: new Web3(config.RPCs.rinkeby),
    ropsten: new Web3(config.RPCs.ropsten),
    binance: new Web3(config.RPCs.binance)

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