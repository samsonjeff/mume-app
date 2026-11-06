// Live speech-to-text check: exercises the real transcription path.
// Usage: node stt-check.js [audio-file.wav|mp3|m4a]
//   With a file: transcribes it (use a real voice recording to try it for real).
//   Without one: sends a 1.5s 440Hz tone — the model should answer "no text",
//   which still proves key + network + audio format all work.
// Needs backend/.env (META_MODEL_API_KEY) and internet to api.meta.ai.
// The API server itself does NOT need to be running (calls the service directly).
const fs = require("node:fs")
const path = require("node:path")
const { execFile } = require("node:child_process")
const {
  transcribeMuseAudio,
  readWavFormat,
  getMetaConfig,
} = require("./src/services/muse")

function loadEnvFileIfPresent(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
    for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith("#")) continue
      const eq = line.indexOf("=")
      if (eq <= 0) continue
      const key = line.slice(0, eq).trim()
      if (key && process.env[key] === undefined) {
        process.env[key] = line
          .slice(eq + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2")
      }
    }
  } catch {}
}

function makeToneWav(seconds = 1.5, rate = 24000) {
  const n = Math.floor(seconds * rate)
  const buf = Buffer.alloc(44 + n * 2)
  buf.write("RIFF", 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write("WAVE", 8)
  buf.write("fmt ", 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write("data", 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 16000),
      44 + i * 2,
    )
  }
  return buf
}

;(async () => {
  loadEnvFileIfPresent(path.resolve(__dirname, ".env"))
  const cfg = getMetaConfig()
  console.log(
    "key configured:",
    Boolean(cfg.apiKey),
    "| base:",
    cfg.baseUrl,
    "| model:",
    cfg.sttModel,
  )

  await new Promise((resolve) => {
    execFile(process.env.MUSE_FFMPEG_PATH || "ffmpeg", ["-version"], (err) => {
      console.log(
        "ffmpeg:",
        err && err.code === "ENOENT"
          ? "MISSING (only non-WAV input needs it)"
          : "present",
      )
      resolve()
    })
  })

  const file = process.argv[2]
  const bytes = file ? fs.readFileSync(file) : makeToneWav()
  console.log(
    "audio:",
    file || "(generated 440Hz tone)",
    "| bytes:",
    bytes.length,
    "| wav:",
    JSON.stringify(readWavFormat(bytes)),
  )

  try {
    const text = await transcribeMuseAudio({ audio: bytes })
    console.log("TRANSCRIPT:", JSON.stringify(text))
  } catch (err) {
    console.log("FAILED:", err.message)
    if (/no text/i.test(err.message)) {
      console.log(
        "(That answer on a pure tone still proves key + network + format are fine — retry with a real voice clip.)",
      )
    }
  }
})()
