const Store = require('../store/store')
const { StreamMap, updateStream } = require('../lib/stream')

const getStatusMainAccountTransferAction = async (ctx) => {
    try {
        const query = ctx.request.query
        if (!query.id) {
            ctx.status = 444
            return
        }

        const status = await Store.main.findOne({ key: 'TransferStatus', id: query.id })
        if (!status) {
            ctx.body = { code: 404, message: 'No records found' }
            return
        }

        delete status._id
        delete status.key

        ctx.status = 200
        ctx.body = { code: 0, data: status }
    }
    catch (e) {
        console.log(e)
    }
}

module.exports = {
    getStatusMainAccountTransferAction
}