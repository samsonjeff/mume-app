// Voice "send this message to ..." command parser (plain JS: unit-tested with node --test).

/**
 * Returns the message body to deliver to the open customer thread,
 * or null when the transcript carries no send-to-customer intent.
 * @param {string} transcript
 * @returns {string | null}
 */

// shortcut: "to <name>" takes the first word as the name unless a colon,

// comma or dash ends it — multi-word names need that delimiter.

function extractSendToCustomerText(transcript) {
  const cmd = transcript.match(
    /^\s*(?:(?:please|kindly)\s+|(?:hey\s+)?mume\s*,?\s+)?send\s+(this|that|it)(\s+(message|voice(\s*note)?|audio|recording))?/i,
  )

  if (!cmd || cmd.index === undefined) return null

  const rest = transcript.slice(cmd.index + cmd[0].length).trim()

  // "to <name>: message" — any-length name ended by a delimiter.

  let m = rest.match(/^to\s+[\w\s.]+?\s*[:,\-–—]\s*([\s\S]*)$/i)

  if (m) return (m[1] || "").trim() || transcript.trim()

  // "to <name> message" — first word after "to" is the name.

  m = rest.match(/^to\s+\S+\s+([\s\S]*)$/i)

  if (m) return (m[1] || "").trim() || transcript.trim()

  // Bare command (or "to <name>" alone) — keep the whole recording text.

  const tail = rest
    .replace(/^to\s+[\w\s.]+\s*$/i, "")
    .replace(/^[:,\-–—]\s*/, "")
    .trim()

  return tail || transcript.trim()
}


// "send <message> to <name>" command parser (plain JS: unit-tested with node --test).
// Returns { body, targetName } when the transcript starts with a send/deliver
// command, or null for ordinary chat. targetName is null when no explicit
// recipient was named (e.g. bare "send hello").
function stripSendCommand(transcript) {
  const m = String(transcript || "").match(
    /^\s*(?:(?:please|kindly)\s+|(?:hey\s+)?mume\s*,?\s+)?(send|sent|deliver(?:ed|ing)?)\b\s*/i,
  )
  if (!m) return null
  return String(transcript).slice(m.index + m[0].length)
}

function cleanSendBody(body) {
  let b = String(body || "").trim()

  b = b.replace(/^(this\s+(message\s+)?|that\s+|it\s*)[:,"']?\s*/i, "").replace(/^(this|that|it)$/i, "")

  return b.replace(/^[:,"'\s]+|[:,"'\s]+$/g, "")
}

function parseSendToCustomer(transcript) {
  const working = stripSendCommand(transcript)
  if (working === null) return null
  const text = working.trim()
  if (!text) return { body: "", targetName: null }
  // "to <name>: body" (any-length name ended by a delimiter)
  let m = text.match(/^to\s+([A-Za-z][A-Za-z .]*?)[:,\u2014\u2013-]\s*([\s\S]+)$/i)
  if (m) return { body: cleanSendBody(m[2]), targetName: m[1].trim() }
  // Bare "to <name>" — no message yet; caller prompts for it.
  m = text.match(/^to\s+([A-Za-z][A-Za-z .]*?)\s*$/i)
  if (m) return { body: "", targetName: m[1].trim() }
  // "<body> to <name>"
  m = text.match(/^([\s\S]*)\s+to\s+([A-Za-z][A-Za-z .]*?)\s*$/i)
  if (m && m[1].trim()) return { body: cleanSendBody(m[1]), targetName: m[2].trim() }
  // "to <name> <body>"
  m = text.match(/^to\s+([A-Za-z][A-Za-z .]*?)[:,]?\s+([\s\S]+)$/i)
  if (m) return { body: cleanSendBody(m[2]), targetName: m[1].trim() }
  return { body: cleanSendBody(text), targetName: null }
}

// First word / substring match over inbox threads (real convos first,
// demo threads after — callers pass [...realInboxConvos, ...DUMMY_CONVOS]).
function findConvoByName(convos, targetName) {
  const list = Array.isArray(convos) ? convos : []
  const needle = String(targetName || "").trim().toLowerCase()
  if (!needle) return null
  const firstWord = needle.split(/\s+/)[0]
  return (
    list.find((c) => String((c && c.name) || "").toLowerCase().includes(needle)) ||
    list.find(
      (c) => String((c && c.name) || "").toLowerCase().split(/\s+/)[0] === firstWord,
    ) ||
    null
  )
}

module.exports = {
  extractSendToCustomerText,
  parseSendToCustomer,
  findConvoByName,
}

