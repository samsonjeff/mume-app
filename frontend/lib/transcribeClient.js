// Bounded transcription request: the hosted backend can take 15s+ to wake
// from sleep, and a bare fetch would hang the mic UI forever. One attempt
// warms a sleeping server; the single retry then usually delivers.
// Plain JS so it runs under node --test with no toolchain.
async function sleep(ms, sleepImpl) {
  if (sleepImpl) return sleepImpl(ms)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toTranscribeError(err) {
  if (err && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new Error(
      "Transcription timed out — the server may be waking up. Try again in a moment.",
    )
  }
  return err
}

/**
 * POSTs a transcription payload with a timeout and one retry.
 * Retries network failures and 5xx (a cold server often answers the
 * second attempt); 4xx fails fast. Throws an actionable Error.
 */
async function postTranscribe({
  url,
  apiKey,
  payload,
  timeoutMs = 60000,
  sleepMs = 1000,
  fetchImpl = fetch,
  sleepImpl,
}) {
  const headers = { "Content-Type": "application/json" }
  if (apiKey) headers["x-api-key"] = apiKey
  const body = JSON.stringify(payload)
  let lastErr = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    let res = null
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err) {
      lastErr = err
      if (attempt < 2) await sleep(sleepMs, sleepImpl)
      continue
    }
    if (res.ok) return res.json()
    const errBody = await res.json().catch(() => ({}))
    lastErr = new Error(
      (errBody && errBody.error) || "Voice transcription failed",
    )
    if (res.status) lastErr.status = res.status
    if (attempt < 2 && res.status >= 500) {
      await sleep(sleepMs, sleepImpl)
      continue
    }
    break
  }
  throw toTranscribeError(lastErr)
}

module.exports = { postTranscribe }
