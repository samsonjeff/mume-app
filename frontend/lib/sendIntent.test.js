const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { extractSendToCustomerText, parseSendToCustomer, findConvoByName } = require("./sendIntent")

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

describe("parseSendToCustomer", () => {
  it('parses "send <message> to <name>"', () => {
    assert.deepEqual(parseSendToCustomer("send hello message to maria"), {
      body: "hello message",
      targetName: "maria",
    })
  })

  it('parses "send to <name>: <message>"', () => {
    assert.deepEqual(parseSendToCustomer("send to maria: hello po"), {
      body: "hello po",
      targetName: "maria",
    })
  })

  it("accepts please/mume prefixes and deliver verb", () => {
    assert.deepEqual(parseSendToCustomer("please send hello to maria"), {
      body: "hello",
      targetName: "maria",
    })

    assert.deepEqual(parseSendToCustomer("mume, deliver hi to Jun"), {
      body: "hi",
      targetName: "Jun",
    })
  })

  it("returns an empty body when the message is missing", () => {
    assert.deepEqual(parseSendToCustomer("send to maria"), {
      body: "",
      targetName: "maria",
    })
  })

  it("returns null without a leading send command", () => {
    assert.equal(parseSendToCustomer("how much are apples"), null)

    assert.equal(
      parseSendToCustomer("How do I send this message to someone"),
      null,
    )
  })
})

describe("parseSendToCustomer backups", () => {
  it('treats "send", "sent", "send it", "sent this" as message-less backups', () => {
    assert.deepEqual(parseSendToCustomer("send"), { body: "", targetName: null })

    assert.deepEqual(parseSendToCustomer("sent"), { body: "", targetName: null })

    assert.deepEqual(parseSendToCustomer("send it"), { body: "", targetName: null })

    assert.deepEqual(parseSendToCustomer("sent this"), { body: "", targetName: null })

    assert.deepEqual(parseSendToCustomer("deliver that"), { body: "", targetName: null })
  })

  it("keeps a message without a named recipient", () => {
    assert.deepEqual(parseSendToCustomer("send hello"), {
      body: "hello",
      targetName: null,
    })
  })
})

describe("findConvoByName", () => {
  const convos = [
    { id: "a", name: "Maria A." },

    { id: "b", name: "Jun L." },
  ]

  it("matches case-insensitively by substring", () => {
    assert.equal(findConvoByName(convos, "maria").id, "a")
  })

  it("matches by first word", () => {
    assert.equal(findConvoByName(convos, "Jun").id, "b")
  })

  it("returns null when nothing matches", () => {
    assert.equal(findConvoByName(convos, "Rica"), null)

    assert.equal(findConvoByName(convos, ""), null)
  })
})

