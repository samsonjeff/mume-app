const { test } = require("node:test")

const assert = require("node:assert/strict")

const {
  stripDataUrlPrefix,

  readWavFormat,

  transcribeMuseAudio,
} = require("../src/services/muse")

function normalizeFileUri(uri) {
  return String(uri || "").replace(/^file:\/(?!\/)/i, "file:///")
}

function pcmBufferToMonoFloat32(data, channels = 1, encoding = "int16") {
  if (!data || data.byteLength === 0) return new Float32Array(0)

  const raw =
    data instanceof ArrayBuffer
      ? data
      : ArrayBuffer.isView(data)
        ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        : data

  const ch = Math.max(1, channels || 1)

  const bytesPerSample = encoding === "float32" ? 4 : 2

  const frames = Math.floor(raw.byteLength / (ch * bytesPerSample))

  if (frames <= 0) return new Float32Array(0)

  const view = new DataView(raw)

  const out = new Float32Array(frames)

  for (let f = 0; f < frames; f++) {
    let sum = 0

    for (let c = 0; c < ch; c++) {
      const off = (f * ch + c) * bytesPerSample

      const sample =
        encoding === "float32"
          ? view.getFloat32(off, true)
          : view.getInt16(off, true) / 32768

      sum += sample
    }

    out[f] = Math.max(-1, Math.min(1, sum / ch))
  }

  return out
}

function encodeWavBase64(chunks, fromRate, toRate = 24000) {
  let total = 0

  for (const c of chunks) total += c.length

  const pcm = new Float32Array(total)

  let o = 0

  for (const c of chunks) {
    pcm.set(c, o)

    o += c.length
  }

  const outLen = Math.max(1, Math.floor((total * toRate) / fromRate))

  const data = new Int16Array(outLen)

  for (let i = 0; i < outLen; i++) {
    const pos = (i * fromRate) / toRate

    const i0 = Math.floor(pos)

    const frac = pos - i0

    const a = pcm[Math.min(i0, total - 1)] || 0

    const b = pcm[Math.min(i0 + 1, total - 1)] || 0

    const v = Math.max(-1, Math.min(1, a + (b - a) * frac))

    data[i] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767)
  }

  const buffer = new ArrayBuffer(44 + outLen * 2)

  const v = new DataView(buffer)

  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
  }

  writeStr(0, "RIFF")

  v.setUint32(4, 36 + outLen * 2, true)

  writeStr(8, "WAVE")

  writeStr(12, "fmt ")

  v.setUint32(16, 16, true)

  v.setUint16(20, 1, true)

  v.setUint16(22, 1, true)

  v.setUint32(24, toRate, true)

  v.setUint32(28, toRate * 2, true)

  v.setUint16(32, 2, true)

  v.setUint16(34, 16, true)

  writeStr(36, "data")

  v.setUint32(40, outLen * 2, true)

  new Int16Array(buffer, 44).set(data)

  return Buffer.from(buffer).toString("base64")
}

test("voice: data-URL prefix is stripped before base64 decoding", () => {
  assert.equal(stripDataUrlPrefix("data:audio/wav;base64,"), "")

  assert.equal(stripDataUrlPrefix("data:audio/m4a;base64,"), "")

  const payload = Buffer.from("hello").toString("base64")

  assert.equal(stripDataUrlPrefix(`data:audio/wav;base64,${payload}`), payload)

  assert.equal(stripDataUrlPrefix(payload), payload)

  assert.equal(stripDataUrlPrefix(""), "")
})

test("voice: empty data URL decodes to zero bytes, not 14", () => {
  const bytes = Buffer.from(
    stripDataUrlPrefix("data:audio/wav;base64,"),
    "base64",
  )

  assert.equal(bytes.length, 0)
})

test("voice: normalizeFileUri fixes Android single-slash file:/ URLs", () => {
  assert.equal(
    normalizeFileUri(
      "file:/data/user/0/com.mume.app/cache/AudioStream/stream-123.wav",
    ),

    "file:///data/user/0/com.mume.app/cache/AudioStream/stream-123.wav",
  )

  assert.equal(
    normalizeFileUri(
      "file:///var/mobile/Containers/Data/Application/stream-123.wav",
    ),

    "file:///var/mobile/Containers/Data/Application/stream-123.wav",
  )

  assert.equal(
    normalizeFileUri("blob:https://example.com/abc"),
    "blob:https://example.com/abc",
  )
})

test("voice: live onBuffer PCM chunks encode to 24 kHz mono 16-bit WAV accepted by transcribeMuseAudio", async () => {
  // Simulate 1.2s of 48 kHz stereo int16 hardware buffers emitted by AudioStream.onBuffer

  const hwRate = 48000

  const totalFrames = Math.floor(hwRate * 1.2)

  const rawBuf = new ArrayBuffer(totalFrames * 2 * 2)

  const view = new DataView(rawBuf)

  for (let i = 0; i < totalFrames; i++) {
    const sample = Math.round(
      Math.sin((2 * Math.PI * 440 * i) / hwRate) * 16000,
    )

    view.setInt16(i * 4, sample, true)

    view.setInt16(i * 4 + 2, sample, true)
  }

  const monoChunk = pcmBufferToMonoFloat32(rawBuf, 2, "int16")

  assert.equal(monoChunk.length, totalFrames)

  const b64 = encodeWavBase64([monoChunk], hwRate, 24000)

  const wavBytes = Buffer.from(b64, "base64")

  const fmt = readWavFormat(wavBytes)

  assert.deepEqual(fmt, {
    audioFormat: 1,

    channels: 1,

    sampleRate: 24000,

    bitsPerSample: 16,
  })

  assert.ok(wavBytes.length >= 4096)

  const realFetch = global.fetch

  global.fetch = async () => ({
    ok: true,

    status: 200,

    json: async () => ({ transcript: "how much are the red apples" }),
  })

  try {
    const text = await transcribeMuseAudio({
      audio: wavBytes,

      env: { META_MODEL_API_KEY: "test-key" },
    })

    assert.equal(text, "how much are the red apples")
  } finally {
    global.fetch = realFetch
  }
})
