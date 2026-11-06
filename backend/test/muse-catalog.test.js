const { test } = require("node:test")

const assert = require("node:assert/strict")

const {
  getMumeAiReply,

  buildSessionSummary,

  matchCatalogItem,

  resolveCatalogItem,

  formatMoney,

  buildCatalogContext,

  buildAssistantSystemPrompt,

  listCatalogReply,
} = require("../src/services/ai")

const RICE_CATALOG = [
  { id: "p1", name: "Jasmine Rice 5kg", price: 12.5, unit: "bag" },

  { id: "p2", name: "Brown Rice 1kg", price: 3.2, unit: "kg" },
]

test("catalog: item match is keyword-driven, not hardcoded", () => {
  const hit = matchCatalogItem("how much is jasmine rice?", RICE_CATALOG)

  assert.equal(hit && hit.name, "Jasmine Rice 5kg")

  assert.equal(matchCatalogItem("hello there", RICE_CATALOG), null)
})

test("catalog: follow-up inherits the item from history", () => {
  const item = resolveCatalogItem(
    "how much?",
    [{ sender: "user", text: "brown rice price?" }],
    RICE_CATALOG,
  )

  assert.equal(item && item.name, "Brown Rice 1kg")
})

test("catalog: price question answers from data", () => {
  const reply = getMumeAiReply("how much is jasmine rice?", {
    catalog: RICE_CATALOG,
  })

  assert.ok(reply.includes("Jasmine Rice 5kg"))

  assert.ok(reply.includes("12.50"))

  assert.ok(!reply.toLowerCase().includes("apple"))
})

test("catalog: listing enumerates the store catalog", () => {
  const reply = getMumeAiReply("list my menu", { catalog: RICE_CATALOG })

  assert.ok(reply.includes("2 items"))

  assert.ok(reply.includes("Jasmine Rice 5kg"))

  assert.ok(reply.includes("Brown Rice 1kg"))
})

test("catalog: greeting names no products", () => {
  const reply = getMumeAiReply("hello muse", { catalog: RICE_CATALOG })

  assert.ok(/muse/i.test(reply))

  assert.ok(!reply.includes("Jasmine"))

  assert.ok(!reply.includes("apple"))
})

test("catalog: empty catalog stays honest", () => {
  assert.equal(buildCatalogContext([]), "")

  assert.ok(listCatalogReply([]).toLowerCase().includes("no catalog"))
})

test("role: system prompt adapts to the business", () => {
  const prompt = buildAssistantSystemPrompt({
    storeName: "Rice Dealer",

    catalogContext: buildCatalogContext(RICE_CATALOG),
  })

  assert.ok(prompt.includes("Rice Dealer"))

  assert.ok(prompt.includes("Jasmine Rice 5kg"))

  assert.ok(!prompt.toLowerCase().includes("apple"))

  const empty = buildAssistantSystemPrompt({})

  assert.ok(/no catalog/i.test(empty))
})

test("role: money formats to two decimals", () => {
  assert.equal(formatMoney(4), "$4.00")

  assert.equal(formatMoney(2.5), "$2.50")
})

test("role: session summary names catalog items", () => {
  const summary = buildSessionSummary(
    [{ sender: "user", text: "brown rice price?" }],

    RICE_CATALOG,
  )

  assert.ok(summary.includes("Brown Rice 1kg"))
})
