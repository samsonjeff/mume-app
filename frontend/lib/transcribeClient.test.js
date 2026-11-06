const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { postTranscribe } = require("./transcribeClient")

const URL = "https://example.com/api/voice/transcribe"
const okRes = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({ text }),
})
const errRes = (status, error) => ({
  ok: false,
  status,
  json: async () => ({ error }),
})

describe("postTranscribe", () => {
  it("retries once after a network failure, then delivers", async () => {
    const calls = []
    const fetchImpl = async (...args) => {
      calls.push(args)
      if (calls.length === 1) throw new TypeError("fetch failed")
      return okRes("how much are the red apples")
    }
    const res = await postTranscribe({
      url: URL,
      apiKey: "k",
      payload: { audio: "abc" },
      fetchImpl,
      sleepImpl: async () => {},
    })
    assert.equal(res.text, "how much are the red apples")
    assert.equal(calls.length, 2)
    assert.equal(calls[0][1].headers["x-api-key"], "k")
  })

  it("retries once on a 502, then delivers", async () => {
    let n = 0
    const fetchImpl = async () =>
      ++n === 1 ? errRes(502, "bad gateway") : okRes("hi")
    const res = await postTranscribe({
      url: URL,
      payload: {},
      fetchImpl,
      sleepImpl: async () => {},
    })
    assert.equal(res.text, "hi")
    assert.equal(n, 2)
  })

  it("fails fast on a 400 with the server message", async () => {
    let n = 0
    const fetchImpl = async () => {
      n++
      return errRes(400, "audio (base64) is required")
    }
    await assert.rejects(
      postTranscribe({
        url: URL,
        payload: {},
        fetchImpl,
        sleepImpl: async () => {},
      }),
      /audio \(base64\) is required/,
    )
    assert.equal(n, 1)
  })

  it("maps a timeout into a wake-up-and-retry message", async () => {
    const timeout = new DOMException("The operation timed out", "TimeoutError")
    const fetchImpl = async () => {
      throw timeout
    }
    await assert.rejects(
      postTranscribe({
        url: URL,
        payload: {},
        fetchImpl,
        sleepImpl: async () => {},
      }),
      /waking up/,
    )
  })

  it("omits the api-key header when no key is configured", async () => {
    let sentHeaders = null
    const fetchImpl = async (_url, opts) => {
      sentHeaders = opts.headers
      return okRes("hi")
    }
    await postTranscribe({
      url: URL,
      payload: {},
      fetchImpl,
      sleepImpl: async () => {},
    })
    assert.ok(!("x-api-key" in sentHeaders))
  })
})
