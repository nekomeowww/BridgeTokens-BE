const { default: Web3 } = require("web3")

class Web3Event {
    constructor () {
        this.events = new Map()
    }

    on (eventName, callback) {
        this.events.set(eventName, callback)
    }

    emit (eventName, err, data) {
        try {
            this.events.get(eventName).call(this, err, data)
        }
        catch {
            return
        }
    }
}

module.exports = Web3Event