const crypto = require("node:crypto")

function getEncryptionKey(env = process.env) {
  const secret = env.TOKEN_ENCRYPTION_KEY || env.FB_APP_SECRET
  if (!secret) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "TOKEN_ENCRYPTION_KEY or FB_APP_SECRET must be configured in production",
      )
    }
    return crypto
      .createHash("sha256")
      .update("mume-default-encryption-key-for-dev-32b")
      .digest()
  }
  return crypto.createHash("sha256").update(String(secret)).digest()
}

function encryptToken(plainToken, env = process.env) {
  if (!plainToken) throw new Error("Token to encrypt is required")
  const key = getEncryptionKey(env)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(String(plainToken), "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`
}

function decryptToken(payload, env = process.env) {
  if (!payload) throw new Error("Payload to decrypt is required")
  const parts = String(payload).split(".")
  if (parts.length !== 3)
    throw new Error("Invalid encrypted token payload format")
  const [ivB64, tagB64, dataB64] = parts
  const key = getEncryptionKey(env)
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

function computeAppSecretProof(accessToken, appSecret) {
  if (!accessToken || !appSecret) return null
  return crypto
    .createHmac("sha256", appSecret)
    .update(accessToken)
    .digest("hex")
}

function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!rawBody || !signatureHeader || !appSecret) return false
  const [algo, sigHash] = String(signatureHeader).split("=")
  if (algo !== "sha256" || !sigHash) return false
  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")
  const a = Buffer.from(sigHash, "hex")
  const b = Buffer.from(expectedHash, "hex")
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = {
  encryptToken,
  decryptToken,
  computeAppSecretProof,
  verifyMetaSignature,
}
