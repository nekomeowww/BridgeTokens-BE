const Tx = require('ethereumjs-tx').Transaction

const web3 = require('../module/web3')
const config = require('../../config.json')
const contracts = require('../constants/contracts')
const ABI = require('../constants/abi')
const MainAccount = config.MainAccount

const postConfirmERC20TransferAction = async (ctx) => {
    const { body } = ctx.request
    if (!body.to || !body.network) {
        ctx.status = 444
        return
    }
    else if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.to))) {
        ctx.status = 444
        return
    }

    
}

const postConfirmMainAccountTransferAction = async (ctx) => {
    const { body } = ctx.request
    console.log(body)
    if (!body.to || !body.network || !body.contractName || !body.contractAddr) {
        console.log('not full params')
        ctx.status = 444
        return
    }
    else if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.to))) {
        console.log('to param failed')
        ctx.status = 444
        return
    }
    else if (body.contractName === 'CUSTOM') {
        if (!(/0x[0-9a-zA-Z]{0,40}/.test(body.contractAddr))) {
            console.log('contract name param failed')
            ctx.status = 444
            return
        }
    }
}

module.exports = {
    postConfirmERC20TransferAction,
    postConfirmMainAccountTransferAction
}