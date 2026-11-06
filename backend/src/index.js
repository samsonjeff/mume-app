const fs = require("node:fs")

const path = require("node:path")

function loadEnvFileIfPresent(filePath) {
  try {
    if (!fs.existsSync(filePath)) return

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)

    for (const raw of lines) {
      const line = raw.trim()

      if (!line || line.startsWith("#")) continue

      const eq = line.indexOf("=")

      if (eq <= 0) continue

      const key = line.slice(0, eq).trim()

      const val = line
        .slice(eq + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2")

      if (key && process.env[key] === undefined) {
        process.env[key] = val
      }
    }
  } catch {
    // Best-effort local .env loading
  }
}

loadEnvFileIfPresent(path.resolve(__dirname, "../.env"))

loadEnvFileIfPresent(path.resolve(__dirname, "../../.env"))

const { createApp } = require("./app")

const port = Number(process.env.PORT) || 3000

createApp().listen(port, () => {
  console.log(`mume-backend listening on port ${port}`)
})
