const Common = require('ethereumjs-common').default

const chainId = require('../constants/chainId')
const { networkType, shortName } = require('../constants/networkName')

const getChainForEthereumjsTx = (network) => {
    const id = chainId[network]
    const ethIds = ['ethereum', 'rinkeby', 'ropsten']

    let chainConfigObj = {}
    if (ethIds.indexOf(network) !== -1) {
        chainConfigObj = {
            chain: network
        }
    }
    else {
        const custom = Common.forCustomChain(
            networkType[network],
            {
                name: shortName[network],
                networkId: chainId[network],
                chainId: chainId[network],
            },
            'petersburg',
        )
        chainConfigObj = { common: custom }
    }
    return chainConfigObj
}

module.exports = {
    getChainForEthereumjsTx
}