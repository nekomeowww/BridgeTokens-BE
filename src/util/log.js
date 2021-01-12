// Dependencies
const log4js = require("log4js")

let SysTime = new Date()
let logTime = SysTime.getFullYear() + "-" + ("0" + (SysTime.getMonth() + 1)).slice(-2) + "-" + ("0" + SysTime.getDate()).slice(-2)
const coreLogFileName = `./logs/BridgeTokens-${logTime}.log`

log4js.configure({
    appenders: {
        Core: { type: "file", filename: coreLogFileName },
        console: { type: "console" }
    },
    categories: {
        MatatakiAuth: { appenders: ["console", "Core"], level: "trace" },
        default: { appenders: ["console"], level: "trace" }
    }
})

let MatatakiAuthLogger = log4js.getLogger("BridgeTokens")

function info(log) {
    MatatakiAuthLogger.info(log)
}

function trace(log) {
    MatatakiAuthLogger.trace(log)
}

function debug(log) {
    MatatakiAuthLogger.debug(log)
}

function warning(log) {
    MatatakiAuthLogger.warn(log)
}

function fatal(log) {
    MatatakiAuthLogger.fatal(log)
}

function level(lev) {
    MatatakiAuthLogger.level = lev
}

module.exports = {
    info,
    trace,
    debug,
    warning,
    fatal,
    level
}