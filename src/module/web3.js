const w3 = require('web3').default
const config = require('../../config.json')

const web3 = new w3(
    Web3.givenProvider ||
    new Web3.providers.HttpProvider(
        config.RPCs.rinkeby
    )
)

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