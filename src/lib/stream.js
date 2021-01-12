const { Transform } = require("stream")

const StreamMap = new Map()

class SSEStream extends Transform {
    constructor() {
        super({
            writableObjectMode: true,
        })
    }

    _transform(data, _encoding, done) {
        this.push(`data: ${JSON.stringify(data)}\n\n`)
        done()
    }
}

const updateStream = (streamInstance, data) => {
    streamInstance.write(data)
}

module.exports = {
    SSEStream,
    updateStream,
    StreamMap
}