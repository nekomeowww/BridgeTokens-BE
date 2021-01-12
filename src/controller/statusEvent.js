const Store = require('../store/store')
const { StreamMap, updateStream } = require('../lib/stream')

const getStatusMainAccountTransferAction = async (ctx) => {
    const id = ctx.request.query.streamId
    const stream = await Store.main.findOne({ key: 'StreamInstance', id: id })

    const instance = StreamMap.get(stream.id)

    ctx.status = 200
    ctx.body = instance
}

module.exports = {
    getStatusMainAccountTransferAction
}