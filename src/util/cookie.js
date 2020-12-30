function disassemble (token) {
  if (!token) return { iss: null, exp: 0, platform: null, id: null }
  let tokenPayload = token.substring(token.indexOf('.') + 1)
  tokenPayload = tokenPayload.substring(0, tokenPayload.indexOf('.'))
  return JSON.parse(Buffer.from(tokenPayload, 'base64').toString())
}

module.exports = {
  disassemble
}