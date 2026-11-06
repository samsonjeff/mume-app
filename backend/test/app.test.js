const { test, before, after } = require("node:test")

const assert = require("node:assert/strict")

const crypto = require("node:crypto")

const { createApp, escapeHtml } = require("../src/app")

const {
  encryptToken,
  decryptToken,
  verifyMetaSignature,
} = require("../src/services/crypto")

const {
  getMumeAiReply,
  buildSessionSummary,
  resolveTopic,
} = require("../src/services/ai")

const {
  readWavFormat,

  buildWavTranscodeArgs,

  transcribeMuseAudio,
} = require("../src/services/muse")

let server

let base

const testSecret = "testsecret1234567890123456789012"

before(async () => {
  server = createApp({
    FB_VERIFY_TOKEN: "secret-token",

    FB_APP_ID: "123456789",

    FB_APP_SECRET: testSecret,
  }).listen(0, "127.0.0.1")

  await new Promise((resolve) => server.once("listening", resolve))

  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  server.closeAllConnections()

  await new Promise((resolve) => server.close(resolve))
})

test("crypto: encrypt and decrypt token with AES-256-GCM", () => {
  const env = { FB_APP_SECRET: "supersecretkeyformumetesting123" }

  const plain = "EAAG123456PageTokenSecret"

  const encrypted = encryptToken(plain, env)

  assert.notEqual(encrypted, plain)

  assert.equal(encrypted.split(".").length, 3)

  const decrypted = decryptToken(encrypted, env)

  assert.equal(decrypted, plain)
})

test("crypto: throws error in production when encryption secret is missing", () => {
  const env = { NODE_ENV: "production" }

  assert.throws(() => {
    encryptToken("some-token", env)
  }, /TOKEN_ENCRYPTION_KEY or FB_APP_SECRET/)
})

test("crypto: verify Meta signature HMAC SHA256", () => {
  const secret = "appsecret123"

  const body = Buffer.from('{"object":"page"}')

  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex")

  const valid = verifyMetaSignature(body, `sha256=${hash}`, secret)

  assert.equal(valid, true)

  const invalid = verifyMetaSignature(body, `sha256=wrong`, secret)

  assert.equal(invalid, false)
})

test("security: page names are HTML-escaped before rendering", () => {
  const escaped = escapeHtml('<script>alert("x")</script>')

  assert.ok(!escaped.includes("<script>"))

  assert.ok(escaped.includes("&lt;script&gt;"))

  assert.equal(escapeHtml(null), "")
})

test("GET / returns ok", async () => {
  const res = await fetch(`${base}/`)

  assert.equal(res.status, 200)

  const json = await res.json()

  assert.equal(json.name, "mume-backend")
})

test("GET / echoes challenge if webhook parameters sent to root", async () => {
  const res = await fetch(
    `${base}/?hub.mode=subscribe&hub.verify_token=secret-token&hub.challenge=9999`,
  )

  assert.equal(res.status, 200)

  assert.equal(await res.text(), "9999")
})

test("GET /webhook echoes challenge when verify token matches", async () => {
  const res = await fetch(
    `${base}/webhook?hub.mode=subscribe&hub.verify_token=secret-token&hub.challenge=12345`,
  )

  assert.equal(res.status, 200)

  assert.equal(await res.text(), "12345")
})

test("GET /webhook rejects wrong verify token", async () => {
  const res = await fetch(
    `${base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`,
  )

  assert.equal(res.status, 403)
})

test("POST /webhook rejects unauthenticated payload when FB_APP_SECRET is set", async () => {
  const res = await fetch(`${base}/webhook`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({ object: "page", entry: [] }),
  })

  assert.equal(res.status, 401)
})

test("POST /webhook acknowledges with 200 when signature is valid", async () => {
  const payload = JSON.stringify({ object: "page", entry: [] })

  const hash = crypto
    .createHmac("sha256", testSecret)
    .update(Buffer.from(payload))
    .digest("hex")

  const res = await fetch(`${base}/webhook`, {
    method: "POST",

    headers: {
      "content-type": "application/json",

      "x-hub-signature-256": `sha256=${hash}`,
    },

    body: payload,
  })

  assert.equal(res.status, 200)

  assert.equal(await res.text(), "EVENT_RECEIVED")
})

test("GET /auth/facebook/url returns OAuth URL", async () => {
  const res = await fetch(`${base}/auth/facebook/url`)

  assert.equal(res.status, 200)

  const json = await res.json()

  assert.ok(json.url.includes("facebook.com"))

  assert.ok(json.url.includes("client_id=123456789"))

  assert.ok(json.url.includes("pages_messaging"))
})

test("GET /auth/facebook/callback requires code", async () => {
  const res = await fetch(`${base}/auth/facebook/callback`)

  assert.equal(res.status, 400)
})

test("POST /api/pages/link-direct validates missing fields", async () => {
  const res = await fetch(`${base}/api/pages/link-direct`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({}),
  })

  assert.equal(res.status, 400)
})

test("POST /api/pages/:pageId/messages/reply validates missing fields", async () => {
  const res = await fetch(`${base}/api/pages/123/messages/reply`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({}),
  })

  assert.equal(res.status, 400)
})

test("CORS headers: echoes request origin instead of wildcard", async () => {
  const res = await fetch(`${base}/health`, {
    method: "OPTIONS",

    headers: { origin: "http://localhost:3000" },
  })

  assert.equal(res.status, 204)

  assert.equal(
    res.headers.get("access-control-allow-origin"),
    "http://localhost:3000",
  )
})

test("CORS: echoes configured allowed origin, omits disallowed origin", async () => {
  const corsApp = createApp({ ALLOWED_ORIGINS: "https://app.example.com" })

  const srv = corsApp.listen(0, "127.0.0.1")

  await new Promise((resolve) => srv.once("listening", resolve))

  const srvBase = `http://127.0.0.1:${srv.address().port}`

  try {
    const ok = await fetch(`${srvBase}/health`, {
      headers: { origin: "https://app.example.com" },
    })

    assert.equal(
      ok.headers.get("access-control-allow-origin"),
      "https://app.example.com",
    )

    const bad = await fetch(`${srvBase}/health`, {
      headers: { origin: "https://evil.example" },
    })

    assert.equal(bad.headers.get("access-control-allow-origin"), null)
  } finally {
    srv.closeAllConnections()

    await new Promise((resolve) => srv.close(resolve))
  }
})

test("POST /webhook fails closed when FB_APP_SECRET is not configured", async () => {
  const openApp = createApp({ FB_VERIFY_TOKEN: "secret-token" })

  const srv = openApp.listen(0, "127.0.0.1")

  await new Promise((resolve) => srv.once("listening", resolve))

  try {
    const res = await fetch(`http://127.0.0.1:${srv.address().port}/webhook`, {
      method: "POST",

      headers: { "content-type": "application/json" },

      body: JSON.stringify({ object: "page", entry: [] }),
    })

    assert.equal(res.status, 401)
  } finally {
    srv.closeAllConnections()

    await new Promise((resolve) => srv.close(resolve))
  }
})

test("GET /auth/facebook/url rejects non-allowlisted redirect_uri", async () => {
  const res = await fetch(
    `${base}/auth/facebook/url?redirect_uri=${encodeURIComponent("https://evil.example/cb")}`,
  )

  assert.equal(res.status, 400)
})

test("API key: /api/* requires key when API_KEY is configured", async () => {
  const lockedApp = createApp({ API_KEY: "test-key-123" })

  const srv = lockedApp.listen(0, "127.0.0.1")

  await new Promise((resolve) => srv.once("listening", resolve))

  const srvBase = `http://127.0.0.1:${srv.address().port}`

  try {
    const denied = await fetch(`${srvBase}/api/chat/messages`)

    assert.equal(denied.status, 401)

    const allowed = await fetch(`${srvBase}/api/chat/messages`, {
      headers: { "x-api-key": "test-key-123" },
    })

    assert.equal(allowed.status, 200)
  } finally {
    srv.closeAllConnections()

    await new Promise((resolve) => srv.close(resolve))
  }
})

test("GET /api/chat/messages returns chat history", async () => {
  const res = await fetch(`${base}/api/chat/messages`)

  assert.equal(res.status, 200)

  const data = await res.json()

  assert.ok(Array.isArray(data.messages))

  assert.ok(data.messages.length > 0)
})

test("POST /api/chat/messages validates required text and responds with AI reply", async () => {
  const invalidRes = await fetch(`${base}/api/chat/messages`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({ text: "" }),
  })

  assert.equal(invalidRes.status, 400)

  const validRes = await fetch(`${base}/api/chat/messages`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({ text: "How much are red apples?" }),
  })

  assert.equal(validRes.status, 200)

  const json = await validRes.json()

  assert.equal(json.userMessage.sender, "user")

  assert.equal(json.aiMessage.sender, "mume")

  assert.ok(json.aiMessage.text.includes("2.50"))
})

test("GET /api/chat/messages handles concurrent first-loads without a 500", async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      fetch(`${base}/api/chat/messages`).then((r) => r.status),
    ),
  )

  for (const status of results) {
    assert.equal(status, 200)
  }
})

test("ai: follow-up inherits product topic from session history", () => {
  const history = [
    { sender: "user", text: "Do you have mango?" },

    { sender: "mume", text: "Carabao mangoes are $4.00 / kg (In stock)." },
  ]

  const reply = getMumeAiReply("how much per kilo?", { history })

  assert.ok(reply.includes("4.00"))
})

test("ai: empty history keeps legacy default reply", () => {
  const reply = getMumeAiReply("blah blah random")

  assert.ok(reply.includes("2.50"))
})

test("ai: session summary captures topics and last customer message", () => {
  const summary = buildSessionSummary([
    { sender: "user", text: "magkano ang saging?" },

    { sender: "mume", text: "Lakatan bananas are $1.80 / kg." },
  ])

  assert.ok(summary.includes("banana"))

  assert.ok(summary.includes("magkano ang saging?"))

  assert.equal(
    resolveTopic("is there stock?", [{ sender: "user", text: "apple price?" }]),
    "apple",
  )
})

test("POST /api/pages/:pageId/messages/reply rejects missing approvalStatus instead of auto-approving", async () => {
  const res = await fetch(`${base}/api/pages/123/messages/reply`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({ psid: "999", text: "hello" }),
  })

  assert.equal(res.status, 403)

  const json = await res.json()

  assert.match(json.error, /approval/i)
})

test("POST /api/pages/:pageId/messages/reply rejects non-approved approvalStatus", async () => {
  const res = await fetch(`${base}/api/pages/123/messages/reply`, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({
      psid: "999",
      text: "hello",
      approvalStatus: "pending",
    }),
  })

  assert.equal(res.status, 403)
})

test("double-slash URL normalization: GET //api/chat/messages routes to /api/chat/messages", async () => {
  const res = await fetch(`${base}//api/chat/messages`)

  assert.equal(res.status, 200)

  const data = await res.json()

  assert.ok(Array.isArray(data.messages))
})

test("GET /api/conversations/:conversationId/messages returns stored conversation messages", async () => {
  const res = await fetch(`${base}/api/conversations/test-conv-1/messages`)

  assert.equal(res.status, 200)

  const data = await res.json()

  assert.equal(data.conversationId, "test-conv-1")

  assert.ok(Array.isArray(data.messages))
})

test("voice: readWavFormat rejects non-WAV bytes", () => {
  assert.equal(
    readWavFormat(Buffer.from("not audio at all, far too short")),
    null,
  )

  assert.equal(readWavFormat(Buffer.alloc(100, 0)), null)
})

test("voice: readWavFormat parses mono 16-bit PCM WAV header", () => {
  const header = Buffer.alloc(44, 0)

  header.write("RIFF", 0)

  header.writeUInt32LE(36, 4)

  header.write("WAVE", 8)

  header.write("fmt ", 12)

  header.writeUInt32LE(16, 16)

  header.writeUInt16LE(1, 20) // PCM

  header.writeUInt16LE(1, 22) // mono

  header.writeUInt32LE(24000, 24) // 24 kHz

  header.writeUInt16LE(16, 34) // 16-bit

  const fmt = readWavFormat(header)

  assert.equal(fmt.audioFormat, 1)

  assert.equal(fmt.channels, 1)

  assert.equal(fmt.sampleRate, 24000)

  assert.equal(fmt.bitsPerSample, 16)
})

test("voice: transcode args target mono 24 kHz PCM WAV over pipes", () => {
  const args = buildWavTranscodeArgs()

  assert.ok(args.includes("-ac") && args[args.indexOf("-ac") + 1] === "1")

  assert.ok(args.includes("-ar") && args[args.indexOf("-ar") + 1] === "24000")

  assert.ok(args.includes("pcm_s16le") && args.includes("wav"))

  assert.ok(args.includes("pipe:0") && args.includes("pipe:1"))
})

test("voice: tiny non-WAV clips are rejected with a byte count before any conversion", async () => {
  const env = { META_MODEL_API_KEY: "test-key" }

  await assert.rejects(
    transcribeMuseAudio({ audio: Buffer.alloc(100, 0), env }),

    /WAV file \(100 bytes received/,
  )
})

test("voice: non-WAV without a converter fails with an actionable error, never a fake transcript", async () => {
  const env = {
    META_MODEL_API_KEY: "test-key",

    MUSE_FFMPEG_PATH: "/nonexistent-ffmpeg-binary-for-tests",
  }

  await assert.rejects(
    transcribeMuseAudio({ audio: Buffer.alloc(5000, 1), env }),

    /ffmpeg.*not installed/i,
  )
})
