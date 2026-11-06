const { test, before, after } = require("node:test")

const assert = require("node:assert/strict")

const crypto = require("node:crypto")

const { createApp } = require("../src/app")

let server

let base

const testSecret = "testsecret1234567890123456789012"

function sign(body) {
  return (
    "sha256=" +
    crypto.createHmac("sha256", testSecret).update(body).digest("hex")
  )
}

before(async () => {
  server = createApp({
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

test("POST /webhook accepts a signed page event with empty entries", async () => {
  const raw = JSON.stringify({ object: "page", entry: [] })

  const res = await fetch(`${base}/webhook`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(raw),
    },

    body: raw,
  })

  assert.equal(res.status, 200)

  assert.equal(await res.text(), "EVENT_RECEIVED")
})

test("POST / accepts a signed page event (dashboard callback pointed at root)", async () => {
  const raw = JSON.stringify({ object: "page", entry: [] })

  const res = await fetch(`${base}/`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(raw),
    },

    body: raw,
  })

  assert.equal(res.status, 200)

  assert.equal(await res.text(), "EVENT_RECEIVED")
})

test("POST / rejects an unsigned page event instead of ACK-and-drop", async () => {
  const res = await fetch(`${base}/`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({ object: "page", entry: [] }),
  })

  assert.equal(res.status, 401)
})
