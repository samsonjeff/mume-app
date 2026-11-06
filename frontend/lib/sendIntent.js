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

module.exports = { extractSendToCustomerText }
