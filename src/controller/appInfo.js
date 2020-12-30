// Dependencies
// Local Packages
const package = require('../../package.json')
const config = require('../../config.json')

let getInfo = async (ctx, next) => {
    let query = ctx.request.query
    query = JSON.parse(JSON.stringify(query))

    const supportedChains = Object.keys(config.RPCs)

    const info = {
        appName: package.name,
        version: package.version,
        "supported-chains": supportedChains
    }

    ctx.body = info
}

module.exports = {
    getInfo
}