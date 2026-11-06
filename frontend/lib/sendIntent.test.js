const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { extractSendToCustomerText } = require("./sendIntent")

describe("extractSendToCustomerText", () => {
  it('takes the message after "to <name>:"', () => {
    assert.equal(
      extractSendToCustomerText(
        "Send this message to Maria: Hi, apples are 2.50 per kilo",
      ),
      "Hi, apples are 2.50 per kilo",
    )
  })

  it('takes the message after "to <multi-word name>,"', () => {
    assert.equal(
      extractSendToCustomerText(
        "send this message to Jun L, available pa ang mango",
      ),
      "available pa ang mango",
    )
  })

  it('takes the words after "to <name>" with no delimiter', () => {
    assert.equal(
      extractSendToCustomerText("Please send it to Maria thanks"),
      "thanks",
    )
  })

  it("keeps the whole transcript when the command has no message", () => {
    assert.equal(
      extractSendToCustomerText("SEND THIS MESSAGE TO MARIA"),
      "SEND THIS MESSAGE TO MARIA",
    )
  })

  it('accepts a "Mume, ..." prefix', () => {
    assert.equal(
      extractSendToCustomerText("Mume, send this message to Maria: hello po"),
      "hello po",
    )
  })

  it("ignores ordinary chat with no send intent", () => {
    assert.equal(extractSendToCustomerText("how much are apples"), null)
  })

  it('ignores "send this message" inside a question', () => {
    assert.equal(
      extractSendToCustomerText("How do I send this message to someone"),
      null,
    )
  })
})
