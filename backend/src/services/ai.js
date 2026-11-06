/**
 * Mume AI Assistant reply generator.
 * Inventory-aware, English-only responses for store merchants.
 *
 * Context-aware: pass recent thread history + the persisted session summary so
 * follow-up questions ("how much?", "meron pa?") inherit the product topic
 * instead of falling through to the generic default. Legacy single-argument
 * calls keep byte-identical replies.
 */

const TOPICS = {
  apple: {
    keys: ["apple", "mansanas"],

    label: "red apples",

    priceLine: "Red apples are $2.50/kg. In stock.",
  },

  mango: {
    keys: ["mango", "manga", "mangga"],

    label: "mango",

    priceLine: "Carabao mango is $4.00/kg. In stock.",
  },

  banana: {
    keys: ["banana", "saging"],

    label: "banana",

    priceLine: "Lakatan banana is $1.80/kg. Low stock.",
  },
}

function detectTopic(text) {
  const q = (text || "").toLowerCase()

  for (const key of Object.keys(TOPICS)) {
    if (TOPICS[key].keys.some((k) => q.includes(k))) return key
  }

  return null
}

/**
 * Most recent product topic across the query + thread history.
 * Lets short follow-ups ("how much per kilo?", "is there stock?") resolve
 * to the product already being discussed.
 */

function resolveTopic(query, history) {
  const direct = detectTopic(query)

  if (direct) return direct

  for (let i = (history || []).length - 1; i >= 0; i--) {
    const t = detectTopic(history[i] && history[i].text)

    if (t) return t
  }

  return null
}

/**
 * Rolling plain-language session summary persisted to
 * public.conversation_sessions so the next reply — even after a restart —
 * has thread reference without re-reading the whole history.
 */

function buildSessionSummary(history, catalog) {
  const rows = Array.isArray(history) ? history : []

  const items = Array.isArray(catalog) ? catalog.filter((p) => p && p.name) : []

  const topics = []

  for (const m of rows) {
    if (items.length > 0) {
      const match = matchCatalogItem(m && m.text, items)

      if (match && match.name && !topics.includes(match.name))
        topics.push(match.name)

      continue
    }

    const t = detectTopic(m && m.text)

    if (t && !topics.includes(t)) topics.push(TOPICS[t].label)
  }

  let summary = topics.length
    ? `Discussing: ${topics.join(", ")}.`
    : "General inquiry."

  const lastCustomer = [...rows]

    .reverse()

    .find((m) => m && (m.sender === "user" || m.sender === "customer"))

  if (lastCustomer && lastCustomer.text) {
    summary += ` Last customer message: "${String(lastCustomer.text).slice(0, 120)}".`
  }

  return summary
}

function getMumeAiReply(query, context) {
  const ctx = context || {}

  const history = Array.isArray(ctx.history) ? ctx.history : []

  const customerName = ctx.customerName || ""

  const q = (query || "").toLowerCase().trim()

  const catalog = Array.isArray(ctx.catalog)
    ? ctx.catalog.filter((p) => p && p.name)
    : []

  if (catalog.length > 0) {
    return getCatalogAwareReply(query, {
      history,

      customerName,

      catalog,

      pendingActions: ctx.pendingActions,
    })
  }

  if (q.includes("apple") || q.includes("mansanas")) {
    return "Red apples are $2.50/kg. In stock."
  }

  if (q.includes("mango") || q.includes("manga") || q.includes("mangga")) {
    return "Carabao mango is $4.00/kg. In stock."
  }

  if (q.includes("banana") || q.includes("saging")) {
    return "Lakatan banana is $1.80/kg. Low stock."
  }

  if (
    q.includes("maria") ||
    q.includes("approval") ||
    q.includes("draft") ||
    q.includes("approve")
  ) {
    return "Maria A. waits for a reply on red apples ($2.50/kg)."
  }

  if (
    q.includes("message") ||
    q.includes("inbox") ||
    q.includes("inquir") ||
    q.includes("customer")
  ) {
    if (Array.isArray(ctx.pendingActions))
      return buildPendingStatusReply(ctx.pendingActions)

    return "You have 2 new messages: Maria A. and Jun L."
  }

  if (
    q.includes("price") ||
    q.includes("catalog") ||
    q.includes("inventory") ||
    q.includes("stock")
  ) {
    return "3 items: red apples $2.50/kg, mango $4.00/kg, banana $1.80/kg."
  }

  if (
    q.includes("magkano") ||
    q.includes("kumusta") ||
    q.includes("meron") ||
    q.includes("salamat") ||
    q.includes("po")
  ) {
    return "Hello! Maria A. waits for a reply on red apples ($2.50/kg)."
  }

  if (
    q.includes("hi") ||
    q.includes("hello") ||
    q.includes("hey") ||
    q.includes("mume")
  ) {
    if (customerName) {
      return `Hi ${customerName}! I'm Mume. Ask me about prices, stock, or messages.`
    }

    return "Hi Jefferson! I'm Mume. Ask me about prices, stock, or messages."
  }

  // Context fallback: answer about the product already under discussion.

  const topic = resolveTopic(query, history)

  if (topic) return TOPICS[topic].priceLine

  return "Noted. Ask me about prices, stock, or customer messages."
}

/**
 * True when the merchant message confirms sending waiting customer replies.
 * Covers "yes", "yes send it", "send it", "approve", "go ahead", plus
 * Tagalog assents ("sige", "oo"). Short on purpose: anything longer is
 * a new instruction, not a confirmation.
 */

function isApprovalConfirmation(text) {
  const q = String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!q) return false

  return /^(yes( please| po)?( send( it| them| now)?)?|send( it| them| now| the repl(ies|y)| all)?|reply( now| to them| all)?|approve(d)?( it| all| them)?|go ahead( send( it)?)?|please send( it)?|(sige|oo|opo)( na| po| send| padala)?|(ok|okay)( send( it)?)?)$/.test(
    q,
  )
}

/**
 * True when the merchant declines sending waiting customer replies.
 * Covers "no", "not yet", "cancel", "wait". Anchored short on purpose:
 * anything longer is a new instruction, not a decline.
 */

function isDeclineConfirmation(text) {
  const q = String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!q) return false

  return /^(no|nope|not yet|not now|cancel|don't send|do not send|wait|hold on|later|not today)$/.test(
    q,
  )
}

/**
 * Acknowledgement when the merchant holds waiting replies.
 * Pass the waiting_approval actions enriched with customer_name.
 */

function buildDeclineReply(pending) {
  const list = (pending || []).filter(Boolean)

  const names = list.map((a) =>
    String(a.customer_name || "Customer").replace(/\.+$/, ""),
  )

  const who =
    names.length === 0
      ? "the waiting replies"
      : names.length === 1
        ? `the reply to ${names[0]}`
        : names.length === 2
          ? `the replies to ${names[0]} and ${names[1]}`
          : `the replies to ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`

  return `OK, holding ${who}. Say 'send it' anytime.`
}

/**
 * True when the merchant asks about customer inquiries / pending replies.
 * Confirmation phrases are excluded so "yes, send it" dispatches
 * instead of answering with a status.
 */

function asksAboutInquiries(text) {
  const q = String(text || "").toLowerCase()

  if (!q || isApprovalConfirmation(text)) return false

  return /(inquir|inbox|pending|waiting|approval|customer|message|reply|draft)/.test(
    q,
  )
}

/**
 * Live inquiry status reply: names who is waiting and asks whether to send.
 * Pass the waiting_approval actions enriched with customer_name.
 */

function buildPendingStatusReply(actions) {
  const list = (actions || []).filter(Boolean)

  if (list.length === 0)
    return "You have no customer inquiries waiting right now."

  const names = list.map((a) =>
    String(a.customer_name || "Customer").replace(/\.+$/, ""),
  )

  const who =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`

  const one = names.length === 1

  return one
    ? `1 new message from ${who}. Send it now?`
    : `${list.length} new messages: ${who}. Send now?`
}

/**
 * Confirmation reply after waiting replies were dispatched.
 * Pass the sent entries ({ customer_name }).
 */

function buildConfirmationSentReply(sent) {
  const rawNames = (sent || [])
    .filter(Boolean)
    .map((e) =>
      typeof e === "string"
        ? e
        : e.customerName || e.customer_name || "Customer",
    )

  const names = rawNames.map((n) => String(n).replace(/\.+$/, ""))
  if (names.length === 0) return "Sent!"

  const who =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`

  return `Sent to ${who}!`
}

/**
 * Catalog-adaptive engine: lets Muse act as the merchant's personal
 * assistant for ANY business by grounding replies in the store's own
 * products instead of hardcoded demo inventory. Pure functions so they
 * are unit-testable without a server or database.
 */

function catalogKeywords(name) {
  return String(name || "")

    .toLowerCase()

    .split(/[^a-z0-9]+/)

    .filter((w) => w.length >= 4)
}

function matchCatalogItem(text, catalog) {
  const q = String(text || "").toLowerCase()

  const items = (Array.isArray(catalog) ? catalog : []).filter(
    (i) => i && i.name,
  )

  let best = null

  let bestScore = 0

  for (const item of items) {
    let score = 0

    for (const k of catalogKeywords(item.name)) {
      if (q.includes(k)) score += 2
    }

    const lname = String(item.name).toLowerCase()

    for (const w of q.split(/[^a-z0-9]+/).filter((x) => x.length >= 4)) {
      if (lname.includes(w)) score += 1
    }

    if (score > bestScore) {
      bestScore = score

      best = item
    }
  }

  return bestScore > 0 ? best : null
}

function resolveCatalogItem(query, history, catalog) {
  const direct = matchCatalogItem(query, catalog)

  if (direct) return direct

  for (let i = (history || []).length - 1; i >= 0; i--) {
    const h = history[i]

    const m = matchCatalogItem(h && h.text, catalog)

    if (m) return m
  }

  return null
}

function formatMoney(value) {
  const num = Number(value)

  if (!Number.isFinite(num)) return String(value ?? "")

  return "$" + num.toFixed(2)
}

function formatCatalogLine(item) {
  const unit = item.unit || "piece"

  return item.name + " \u2014 " + formatMoney(item.price) + " per " + unit + "."
}

function listCatalogReply(catalog) {
  const items = (Array.isArray(catalog) ? catalog : []).filter(
    (p) => p && p.name,
  )

  if (items.length === 0) {
    return "No catalog yet. Add products and I will answer from their prices."
  }

  const shown = items
    .slice(0, 10)
    .map((p) => formatCatalogLine(p).replace(/\.$/, ""))

  const more =
    items.length > 10 ? " and " + (items.length - 10) + " more." : "."

  return (
    "Your catalog (" +
    items.length +
    " item" +
    (items.length === 1 ? "): " : "s): ") +
    shown.join("; ") +
    more
  )
}

function wordsInclude(q, words) {
  const set = new Set(
    String(q || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean),
  )

  return words.some((w) => set.has(w))
}

function getCatalogAwareReply(query, opts) {
  const o = opts || {}

  const history = Array.isArray(o.history) ? o.history : []

  const catalog = (o.catalog || []).filter((p) => p && p.name)

  const customerName = o.customerName || ""

  const q = String(query || "").toLowerCase()

  const item = resolveCatalogItem(query, history, catalog)

  const wantsCatalog =
    /(price|pricing|cost|how much|magkano|catalog|menu|list|inventory|stock|available|avail|order|buy|bili|product|item|tinda|paninda|meron)/.test(
      q,
    )

  if (wantsCatalog) {
    if (item) return formatCatalogLine(item)

    return listCatalogReply(catalog)
  }

  if (item) return formatCatalogLine(item)

  if (/(approval|approve|draft)/.test(q)) {
    if (Array.isArray(o.pendingActions))
      return buildPendingStatusReply(o.pendingActions)

    return "Tap Approve on Home to send it."
  }

  if (
    /(inquir|inbox|pending|waiting|approval|customer|message|reply|draft)/.test(
      q,
    )
  ) {
    if (Array.isArray(o.pendingActions))
      return buildPendingStatusReply(o.pendingActions)

    return "You have no customer inquiries waiting right now."
  }

  if (wordsInclude(q, ["hi", "hello", "hey", "mume", "kumusta"])) {
    const who = customerName ? " " + customerName : ""

    return (
      "Hello" + who + "! I'm Muse. Ask me about prices, stock, or messages."
    )
  }

  if (item) return formatCatalogLine(item)

  if (Array.isArray(o.pendingActions) && o.pendingActions.length > 0) {
    return buildPendingStatusReply(o.pendingActions)
  }

  return "Got it! Ask me about prices, stock, or messages."
}

/**
 * The Muse role: a personal AI assistant that adopts whatever business
 * the merchant runs. The catalog is injected per request, so the same
 * role serves a fruit stall, a rice dealer, or any other store without
 * code changes. With no catalog it says so honestly instead of
 * inventing products or prices.
 */

function buildAssistantSystemPrompt(opts) {
  const o = opts || {}

  const lines = [
    "You are Muse, the personal AI assistant of the merchant who runs this store.",
    "Keep every reply to one or two short sentences in plain, simple English.",

    "You adapt to whatever business this store is \u2014 food, retail, services, or anything else.",

    "Ground every product answer in the store catalog below. Never invent products, prices, or stock levels.",

    "You help the merchant: answer price and availability questions, summarize customer inquiries, and draft customer replies.",

    "The latest merchant message is the instruction to act on; earlier messages are context for deciding what to do next.",

    "Nothing is ever sent to a customer without the merchant's explicit approval.",

    "Reply in English at all times, no matter what language the merchant writes in. Never reply in Tagalog or any other language.",
  ]

  if (o.sessionContext) lines.push("Conversation so far: " + o.sessionContext)

  if (o.storeName) lines.push("Store: " + o.storeName + ".")

  if (o.catalogContext) lines.push(o.catalogContext)
  else
    lines.push(
      "No catalog items are registered yet; say so honestly instead of inventing products or prices.",
    )

  return lines.join(" ")
}

function buildCatalogContext(products) {
  const items = (Array.isArray(products) ? products : []).filter(
    (p) => p && p.name,
  )

  if (items.length === 0) return ""

  const lines = items.slice(0, 20).map((p) => "- " + formatCatalogLine(p))

  const more =
    items.length > 20 ? "\n(+" + (items.length - 20) + " more items)" : ""

  return (
    "Store catalog (" +
    items.length +
    " item" +
    (items.length === 1 ? "" : "s") +
    "):\n" +
    lines.join("\n") +
    more
  )
}

module.exports = {
  getMumeAiReply,
  buildSessionSummary,
  resolveTopic,
  detectTopic,
  isApprovalConfirmation,
  asksAboutInquiries,
  buildPendingStatusReply,
  buildConfirmationSentReply,
  isDeclineConfirmation,
  buildDeclineReply,
  matchCatalogItem,
  resolveCatalogItem,
  formatMoney,
  formatCatalogLine,
  buildCatalogContext,
  buildAssistantSystemPrompt,
  listCatalogReply,
}
