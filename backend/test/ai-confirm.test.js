const { test } = require("node:test")

const assert = require("node:assert/strict")

const {
  isApprovalConfirmation,

  asksAboutInquiries,

  buildPendingStatusReply,

  buildConfirmationSentReply,

  isDeclineConfirmation,

  buildDeclineReply,
  getMumeAiReply,
} = require("../src/services/ai")

test("ai: approval confirmation phrases are detected", () => {
  assert.equal(isApprovalConfirmation("yes send it"), true)

  assert.equal(isApprovalConfirmation("Yes, send it"), true)

  assert.equal(isApprovalConfirmation("yes"), true)

  assert.equal(isApprovalConfirmation("send it"), true)

  assert.equal(isApprovalConfirmation("go ahead"), true)

  assert.equal(isApprovalConfirmation("approve"), true)

  assert.equal(isApprovalConfirmation("sige"), true)

  assert.equal(isApprovalConfirmation("reply"), true)

  assert.equal(isApprovalConfirmation("reply now"), true)

  assert.equal(isApprovalConfirmation("Reply."), true)

  assert.equal(isApprovalConfirmation("How much are red apples?"), false)

  assert.equal(isApprovalConfirmation(""), false)

  assert.equal(isApprovalConfirmation("do I have inquiries?"), false)
})

test("ai: inquiry-status questions are detected", () => {
  assert.equal(asksAboutInquiries("do I have inquiries?"), true)

  assert.equal(asksAboutInquiries("you have 2 inquiries?"), true)

  assert.equal(asksAboutInquiries("any pending replies?"), true)

  assert.equal(asksAboutInquiries("How much are red apples?"), false)

  assert.equal(asksAboutInquiries("yes send it"), false)

  assert.equal(asksAboutInquiries("reply"), false)

  assert.equal(asksAboutInquiries("show me the reply"), true)

  assert.equal(asksAboutInquiries("show me the draft"), true)
})

test("ai: decline phrases hold the waiting replies", () => {
  assert.equal(isDeclineConfirmation("no"), true)

  assert.equal(isDeclineConfirmation("not yet"), true)

  assert.equal(isDeclineConfirmation("cancel"), true)

  assert.equal(isDeclineConfirmation("wait"), true)

  assert.equal(isDeclineConfirmation("hold on"), true)

  assert.equal(isDeclineConfirmation("no way"), false)

  assert.equal(isDeclineConfirmation("know"), false)

  assert.equal(isApprovalConfirmation("no"), false)

  const reply = buildDeclineReply([{ customer_name: "Maria A." }])

  assert.ok(reply.includes("Maria A"))

  assert.ok(!reply.includes(".."))

  assert.ok(/hold/i.test(reply))
})

test("ai: pending status reply names inquiries and asks to send", () => {
  const reply = buildPendingStatusReply([
    { customer_name: "Maria A." },

    { customer_name: "Jun L." },
  ])

  assert.ok(reply.includes("2"))

  assert.ok(reply.includes("Maria A"))

  assert.ok(!reply.includes(".."))

  assert.ok(reply.includes("Jun L"))

  assert.ok(/send/i.test(reply))

  assert.equal(
    buildPendingStatusReply([]),

    "You have no customer inquiries waiting right now.",
  )
})

test("ai: confirmation sent reply lists who was contacted", () => {
  const reply = buildConfirmationSentReply([{ customer_name: "Maria A." }])

  assert.ok(/sent/i.test(reply))

  assert.ok(reply.includes("Maria A"))

  assert.ok(!reply.includes(".."))
})

test("ai: merchant-facing replies stay short", () => {
  const samples = [
    getMumeAiReply("how much are apples?"),
    getMumeAiReply("any messages?"),
    getMumeAiReply("hi muse"),
    getMumeAiReply("price list please"),
    getMumeAiReply("whatever xyz"),
    buildPendingStatusReply([
      { customer_name: "Maria A." },
      { customer_name: "Jun L." },
    ]),
    buildPendingStatusReply([{ customer_name: "Maria A." }]),
    buildConfirmationSentReply([{ customer_name: "Maria A." }]),
    buildDeclineReply([{ customer_name: "Maria A." }]),
  ]
  for (const s of samples) {
    assert.ok(
      s.length > 0 && s.length <= 120,
      "reply not short (" + s.length + "): " + s,
    )
  }
})
