const { test } = require("node:test")

const assert = require("node:assert/strict")

const { buildApprovalDbWrites } = require("../src/app")

test("approval writes: dispatched approval marks sent and keeps graph id", () => {
  const writes = buildApprovalDbWrites({
    actionId: "action-1",
    conversationId: "conv-1",
    replyText: "Hi! Red apples are $2.50 / kg.",
    graphResult: { message_id: "mid.123" },
    dispatched: true,
    now: "2026-11-06T00:00:00.000Z",
  })

  assert.equal(writes.pendingUpdate.status, "sent")
  assert.equal(
    writes.pendingUpdate.draft_reply,
    "Hi! Red apples are $2.50 / kg.",
  )
  assert.equal(writes.messageInsert.fb_message_id, "mid.123")
  assert.equal(writes.messageInsert.conversation_id, "conv-1")
  assert.equal(writes.messageInsert.sender, "page")
  assert.equal(writes.messageInsert.is_from_customer, false)
  assert.equal(
    writes.conversationUpdate.last_message_at,
    "2026-11-06T00:00:00.000Z",
  )
})

test("approval writes: failed dispatch still persists reply to database", () => {
  const writes = buildApprovalDbWrites({
    actionId: "action-2",
    conversationId: "conv-2",
    replyText: "Edited reply from merchant.",
    graphResult: null,
    dispatched: false,
    now: "2026-11-06T00:00:00.000Z",
  })

  assert.equal(writes.pendingUpdate.status, "approved")
  assert.equal(
    writes.pendingUpdate.draft_reply,
    "Edited reply from merchant.",
  )
  assert.ok(writes.messageInsert, "approved reply must insert a message row")
  assert.match(writes.messageInsert.fb_message_id, /^approved-action-2-/)
  assert.equal(
    writes.messageInsert.text,
    "Edited reply from merchant.",
  )
  assert.equal(writes.messageInsert.conversation_id, "conv-2")
  assert.ok(
    writes.conversationUpdate.last_message_at,
    "conversation timestamp must advance on approval",
  )
})
