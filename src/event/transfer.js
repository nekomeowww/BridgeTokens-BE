const web3 = require('../module/web3')

const Web3Event = require('../event/eventEmitter')
const contracts = require('../constants/contracts')
const ABI = require('../constants/abi')

/**
 * ERC20Transfer 类型作用是监听 ERC20 代币的地址，并监听全局的 transfer 事件，同时
 * 在该实例中创建两个内容：新建的事件触发器，以及新建的监听器，监听器接收三个参数，参数类
 * 型为字符串，将从传入的参数中判断是否从已经预设好的地址载入合约或是载入传入的合约地址。
 */
const ERC20Transfer = {
    /**
     * 该对象创建了一个 Web3Event 事件触发器类型
     * 包含 on 和 emit 两个子成员方法
     */
    eventEmitter: new Web3Event(),
    /**
     * 该方法提供一个可调用接口供其他调度模块和服务模块调用
     * 传入三个参数，该方法将从传入的三个方法中判断是否使用传入参数的合约地址，亦或是预设值
     * @param {String} network              - 区块链网络名称，全小写
     * @param {String} contractName         - 合约名称，默认值为 ANT，如果该值为 CUSTOM 则载入传入的合约地址
     * @param {String} contractAddr         - 合约地址，只有当 contractName 为 CUSTOM 时才会生效
     */
    listener: async function (network, contractName = 'ANT', contractAddr) {
        let contract
        if (contractName === 'CUSTOM') {
            contract = new web3[network].eth.Contract(ABI['ERC20'], contractAddr)
        }
        else contract = new web3[network].eth.Contract(ABI[contractName], contracts[network][contractName])

        // 监听全局 transfer 事件
        contract.events.Transfer()
        .on('data', (event) => {
            this.eventEmitter.emit('transfer', undefined, event)
        })
        .on('error', (error) => {
            this.eventEmitter.emit('transfer', error, undefined)
        })
    },
    delete: function () {
        delete this.listener
    }
}

/**
 * MainAccountTransfer 类型作用是监听并有且只有在 event 的 to 关键字中匹配预设账号地址
 * 的 transfer 事件，并返回。同时在该实例中创建两个内容：新建的事件触发器，以及新建的监听
 * 器，监听器接收三个参数，参数类型为字符串，将从传入的参数中判断是否从已经预设好的地址载入
 * 合约或是载入传入的合约地址。
 */
const MainAccountTransfer = {
    /**
     * 该对象创建了一个 Web3Event 事件触发器类型
     * 包含 on 和 emit 两个子成员方法
     */
    eventEmitter: new Web3Event(),
    /**
     * 该方法提供一个可调用接口供其他调度模块和服务模块调用
     * 传入三个参数，该方法将从传入的三个参数中判断是否使用传入参数的合约地址，亦或是预设值
     * @param {String} account              - 转账的目标用户
     * @param {String} network              - 区块链网络名称，全小写
     * @param {String} contractName         - 合约名称，默认值为 ANT，如果该值为 CUSTOM 则载入传入的合约地址
     * @param {String} contractAddr         - 合约地址，只有当 contractName 为 CUSTOM 时才会生效
     */
    listener: async function (account, network) {
        const id = setInterval(async () => {
            let block = await web3[network].eth.getBlock('latest')
            console.log(`[*] Searching block ${block.number}...`)
            if (block && block.transactions) {
                for (let txHash of block.transactions) {
                    let tx
                    try { tx = await web3[network].eth.getTransaction(txHash) }
                    catch { continue }

                    let txText
                    try { txText = JSON.stringify(tx) }
                    catch { continue }

                    if (account === tx.to) {
                        console.log(`[+] Transaction found on block ${block.number}`)
                        res = tx
                        this.eventEmitter.emit('transfer', undefined, res)
                    }
                }
            }
        }, 2000)

        this.intervalId = id
    },
    delete: function () {
        delete this.listener
        clearInterval(this.intervalId)
    },
    intervalId: null
}

module.exports = {
    ERC20Transfer,
    MainAccountTransfer
}

// let contract
// if (contractName === 'CUSTOM') {
//     contract = new web3[network].eth.Contract(ABI['ERC20'], contractAddr)
// }
// else contract = new web3[network].eth.Contract(ABI[contractName], contracts[network][contractName])
// contract.events.Transfer()
// .on('data', (event) => {
//     if (event.returnValues.to === MainAccount) this.eventEmitter.emit('transfer', undefined, event)
// })
// .on('error', (error) => {
//     this.eventEmitter.emit('transfer', error, undefined)
// })