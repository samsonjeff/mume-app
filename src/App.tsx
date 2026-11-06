import { useEffect, useState, useRef, useCallback } from "react"

import Header from "./components/Header"

import SettingsView from "./components/SettingsView"

import Icon from "./components/Icon"

import appleImg from "./assets/apple.jpg"

import mangoImg from "./assets/mango.jpg"

import bananaImg from "./assets/banana.jpg"

import mumeBlackSvg from "./assets/mume-black.svg"

import mumeWhiteSvg from "./assets/mume-white.svg"

import { supabase } from "./lib/supabase"

import { api } from "./lib/api"

export interface Product {
  id: string

  name: string

  price: string

  stock: "In stock" | "Low stock" | "Out of stock"

  isStock?: boolean

  imageKey: "apple" | "mango" | "banana" | "custom"

  imageUri?: string
}

const FRUIT_IMAGE_MAP: Record<"apple" | "mango" | "banana", string> = {
  apple: appleImg,

  mango: mangoImg,

  banana: bananaImg,
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",

    name: "Red apples",

    price: "$2.50 / kg",

    stock: "In stock",

    imageKey: "apple",
  },

  {
    id: "prod-2",

    name: "Carabao mango",

    price: "$4.00 / kg",

    stock: "In stock",

    imageKey: "mango",
  },

  {
    id: "prod-3",

    name: "Lakatan banana",

    price: "$1.80 / kg",

    stock: "Low stock",

    imageKey: "banana",
  },
]

type Tab = "home" | "inbox" | "catalog" | "settings"

type VoiceState = "idle" | "listening" | "thinking"

interface ChatMessage {
  id: string

  sender: "user" | "mume"

  text: string

  time: string
}

function getMumeAiReply(query: string): string {
  const q = query.toLowerCase().trim()

  if (
    q.includes("hi") ||
    q.includes("hello") ||
    q.includes("hey") ||
    q.includes("mume") ||
    q.includes("kumusta")
  ) {
    return "Hi! I'm Mume. Ask me about prices, stock, or messages."
  }

  if (
    q.includes("price") ||
    q.includes("catalog") ||
    q.includes("inventory") ||
    q.includes("stock") ||
    q.includes("order") ||
    q.includes("customer") ||
    q.includes("inquiry") ||
    q.includes("message") ||
    q.includes("magkano") ||
    q.includes("meron") ||
    q.includes("salamat") ||
    q.includes("po")
  ) {
    return "Still connecting. Ask again in a moment."
  }

  return "Noted. Ask me about prices, stock, or messages."
}

const AI_REPLY_MAX_LEN = 320

// Mume AI chat output must stay short and simple plain text: strip markdown
// and clamp length at the display layer so every source (API, Supabase,
// realtime, fallback) renders the same way without touching stored data.
function toShortPlainText(text: string): string {
  let out = String(text || '')
  out = out.replace(/```[\s\S]*?```/g, ' ')
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
  out = out.replace(/(\*\*|__)(.*?)\1/g, '$2')
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  out = out.replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '')
  out = out.replace(/`([^`]*)`/g, '$1')
  out = out.replace(/[*_~]/g, '')
  out = out.replace(/\s+/g, ' ').trim()
  if (out.length > AI_REPLY_MAX_LEN) {
    const cut = out.slice(0, AI_REPLY_MAX_LEN)
    const lastSpace = cut.lastIndexOf(' ')
    out = (lastSpace > 200 ? cut.slice(0, lastSpace) : cut).trim() + ' …'
  }
  return out
}

function VoiceWave() {
  return (
    <span aria-hidden="true" className="voice-wave">
      {[0, 1, 2, 3, 4].map((bar) => (
        <i key={bar} style={{ animationDelay: `${bar * 80}ms` }} />
      ))}
    </span>
  )
}

export interface PendingActionData {
  id?: string

  customerName?: string

  customerMessage?: string

  draftReply?: string
}

const MOCK_DRAFT_REPLY =
  "Hi! Our red apples are $2.50 / kg. Fresh delivery today."

function PendingAction({
  onApproved,

  isApproved = false,

  onEditingChange,

  action,
}: {
  onApproved: (sentText: string) => void

  isApproved?: boolean

  onEditingChange?: (isEditing: boolean) => void

  action?: PendingActionData | null
}) {
  const [editing, setEditing] = useState(false)

  const [draftReply, setDraftReply] = useState(
    action?.draftReply || MOCK_DRAFT_REPLY,
  )

  const cardRef = useRef<HTMLDivElement>(null)

  const toggleEditing = () => {
    setEditing((prev) => {
      const next = !prev

      onEditingChange?.(next)

      if (next) {
        setTimeout(() => {
          cardRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }, 50)
      }

      return next
    })
  }

  const startEditing = () => {
    setEditing(true)

    onEditingChange?.(true)

    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }

  if (isApproved) {
    return (
      <div className="empty-card-approved">
        <div className="empty-check-badge">
          <Icon name="check" size={26} />
        </div>
        <h3 className="empty-card-approved-title">All Caught Up!</h3>
        <p className="empty-card-approved-subtitle">
          Reply confirmed and dispatched to {action?.customerName || "Maria"}{" "}
          via Meta Graph API.
        </p>
      </div>
    )
  }

  return (
    <section
      ref={cardRef}
      className={`approval-card action-needed-card ${
        editing ? "is-editing" : ""
      }`}
      aria-labelledby="approval-title"
    >
      <div className="customer-row">
        <div className="avatar" aria-hidden="true">
          {action?.customerName ? initialsOf(action.customerName) : "MA"}
        </div>
        <div className="flex-1">
          <p className="customer-name">{action?.customerName || "Maria A."}</p>
          <p className="customer-context">Messenger · Price inquiry</p>
        </div>
        <span className="time-label">now</span>
      </div>

      <div className="message-bubble">
        <p>
          {action?.customerMessage
            ? `\u201C${action.customerMessage}\u201D`
            : "“Hi, how much are the red apples?”"}
        </p>
      </div>

      {/* Draft block: Entire text is editable */}
      <div className={`draft-block ${editing ? "draft-block-editing" : ""}`}>
        <div className="draft-label flex items-center gap-1.5">
          <Icon name="bot-svg" size={16} />
          <span>Mume’s suggested reply</span>
        </div>

        {editing ? (
          <div className="draft-editor-wrapper">
            <label htmlFor="draft-reply-input" className="draft-editor-hint">
              Edit message to send to customer:
            </label>
            <textarea
              id="draft-reply-input"
              className="draft-textarea-input"
              value={draftReply}
              onChange={(e) => setDraftReply(e.target.value)}
              onFocus={() => {
                cardRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }}
              rows={3}
              autoFocus
            />
          </div>
        ) : (
          <div
            className="draft-message-display-box"
            onClick={startEditing}
            title="Click to edit full message text"
          >
            <p id="approval-title" className="draft-message-display">
              {draftReply}
            </p>
            <span className="tap-to-edit-hint">Tap to edit full message</span>
          </div>
        )}
      </div>

      <div className="approval-actions">
        <button
          className={`secondary-button min-h-[48px] flex items-center justify-center gap-1.5 ${
            editing ? "active" : ""
          }`}
          onClick={toggleEditing}
          type="button"
        >
          <Icon name={editing ? "check" : "edit"} size={16} />
          <span>{editing ? "Done editing" : "Edit message"}</span>
        </button>

        <button
          className="primary-button min-h-[48px] flex items-center justify-center gap-1.5"
          onClick={() => {
            setEditing(false)

            onEditingChange?.(false)

            onApproved(draftReply)
          }}
          type="button"
        >
          <span>Approve & send</span>
          <Icon name="check" size={18} />
        </button>
      </div>
    </section>
  )
}

function HomeScreen({
  userName,

  isLoggedIn,

  onLogin,

  onApproved,

  onOpenInbox,

  onOpenCatalog,

  onOpenSettings,

  chatMessages,

  isAiThinking,

  isChattingOrTyping = false,

  voiceState = "idle",

  chatCardRef,

  chatScrollRef,

  isApproved = false,

  showApprovedCard = false,

  onEditingChange,

  pendingAction,
}: {
  userName: string

  isLoggedIn: boolean

  onLogin: () => void

  onApproved: (sentText: string) => void

  onOpenInbox: () => void

  onOpenCatalog: () => void

  onOpenSettings: () => void

  chatMessages: ChatMessage[]

  isAiThinking: boolean

  isChattingOrTyping?: boolean

  voiceState?: VoiceState

  chatCardRef?: React.RefObject<HTMLDivElement | null>

  chatScrollRef?: React.RefObject<HTMLDivElement | null>

  isApproved?: boolean

  showApprovedCard?: boolean

  onEditingChange?: (isEditing: boolean) => void

  pendingAction?: PendingActionData | null
}) {
  const localChatScrollRef = useRef<HTMLDivElement>(null)

  const activeChatScrollRef = chatScrollRef || localChatScrollRef

  useEffect(() => {
    if (activeChatScrollRef.current) {
      activeChatScrollRef.current.scrollTop =
        activeChatScrollRef.current.scrollHeight
    }
  }, [chatMessages, isAiThinking, activeChatScrollRef])

  return (
    <>
      <div className="zero-state-hero">
        <div className="hero-copy">
          <h1>
            {isLoggedIn
              ? `Hello, ${userName.trim().split(/\s+/)[0] || userName}`
              : "Welcome to Mume"}
          </h1>
          <p>
            {isLoggedIn
              ? "Welcome to Mume!"
              : "Connect your Facebook Page to start managing inquiries."}
          </p>
        </div>

        {isLoggedIn ? (
          <button type="button" className="action-chip" onClick={onOpenInbox}>
            <Icon name="bookmark" size={14} />
            <span>Message (2)</span>
          </button>
        ) : (
          <button type="button" className="action-chip" onClick={onLogin}>
            <Icon
              name="baseline-facebook"
              size={14}
              className="text-[#1877F2]"
            />
            <span>Login using Facebook</span>
          </button>
        )}
      </div>

      {isLoggedIn ? (
        <>
          {(!isApproved || showApprovedCard) && (
            <>
              <div className="section-heading">
                <h2>Ready for you</h2>
              </div>
              <PendingAction
                key={pendingAction?.id || "mock-action"}
                onApproved={onApproved}
                isApproved={isApproved}
                onEditingChange={onEditingChange}
                action={pendingAction}
              />
            </>
          )}

          {/* Mume AI Chat Thread Stream (Positioned below Pending Action Card) */}
          {chatMessages.length > 0 && (
            <div
              ref={chatCardRef}
              className={`chat-section-card ${
                isChattingOrTyping ? "highlighted-active" : ""
              } ${isApproved && !showApprovedCard ? "expanded" : ""}`}
            >
              <div className="chat-section-header">
                <div className="chat-header-left">
                  <span
                    className={`chat-header-badge ${
                      isChattingOrTyping ? "active" : ""
                    }`}
                  >
                    <Icon name="bot-svg" size={18} />
                  </span>
                  <strong>Mume AI Chat</strong>
                </div>
                {isChattingOrTyping ? (
                  <span className="active-highlight-badge">
                    <span className="active-highlight-dot" />
                    <span>
                      {voiceState === "listening" ? "Listening" : "Typing…"}
                    </span>
                  </span>
                ) : (
                  <span className="chat-header-subtitle">Talk to AI</span>
                )}
              </div>

              <div
                className="chat-messages-list"
                ref={activeChatScrollRef}
              >
                <div className="chat-messages-spacer" />
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row ${
                      msg.sender === "user" ? "user-row" : "mume-row"
                    }`}
                  >
                    {msg.sender === "mume" && (
                      <span className="chat-avatar-ai">
                        <Icon name="bot-svg" size={15} />
                      </span>
                    )}
                    <div
                      className={`chat-bubble ${
                        msg.sender === "user" ? "user-bubble" : "mume-bubble"
                      }`}
                    >
                      <p className="chat-bubble-text">{msg.sender === 'mume' ? toShortPlainText(msg.text) : msg.text}</p>
                      <span className="chat-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="chat-bubble-row mume-row">
                    <span className="chat-avatar-ai">
                      <Icon name="bot-svg" size={15} />
                    </span>
                    <div className="chat-bubble mume-bubble thinking-bubble">
                      <span className="thinking-dot" />
                      <span className="thinking-text">Mume is thinking…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Icon name="log-in" size={28} />
          </div>
          <h3>No Active Store Connected</h3>
          <p>
            You are currently logged out. Connect your Facebook account to view
            customer messages, approve drafts, and manage store catalog.
          </p>
          <button type="button" className="fb-login-btn" onClick={onLogin}>
            <Icon name="baseline-facebook" size={18} />
            <span>Login using Facebook</span>
          </button>
        </div>
      )}
    </>
  )
}

const DUMMY_CONVOS = [
  {
    id: "1",
    initials: "MA",
    name: "Maria A.",
    message: "Hi po, how much ang red apples?",
    time: "now",
    unread: true,
  },

  {
    id: "2",
    initials: "JL",
    name: "Jun L.",
    message: "Available pa po ang mango?",
    time: "8m",
    unread: true,
  },

  {
    id: "3",
    initials: "RS",
    name: "Rica S.",
    message: "Thank you po!",
    time: "1h",
    unread: false,
  },
]

interface ThreadMsg {
  id: string

  from: "customer" | "merchant"

  text: string

  time: string

  // Live delivery receipt for merchant replies, mirrored to the customer thread.

  status?: "sending" | "sent-live" | "seen"

  // How this merchant message entered the thread: typed manually or approved from Home.

  via?: "manual" | "capsule" | "approval"
}

// Seed history per thread so tapping a conversation opens a real thread.

// Merchant bubbles are manual replies the seller typed (not AI drafts).

const THREAD_SEED: Record<string, ThreadMsg[]> = {
  "1": [
    {
      id: "t1-m1",
      from: "customer",
      text: "Hi po, how much ang red apples?",
      time: "now",
    },

    {
      id: "t1-m2",
      from: "merchant",
      text: "Hello po! Red apples are $2.50 per kilo. In stock po today.",
      time: "now",
    },

    {
      id: "t1-m3",
      from: "customer",
      text: "Pwede po pa-reserve ng 2kg for today?",
      time: "now",
    },
  ],

  "2": [
    {
      id: "t2-m1",
      from: "customer",
      text: "Available pa po ang mango?",
      time: "8m",
    },

    {
      id: "t2-m2",
      from: "merchant",
      text: "Yes po! Carabao mango $4.00/kg, fresh Guimaras harvest.",
      time: "7m",
    },
  ],

  "3": [
    { id: "t3-m1", from: "customer", text: "Thank you po!", time: "1h" },

    {
      id: "t3-m2",
      from: "merchant",
      text: "Salamat po! Balik po kayo.",
      time: "1h",
    },
  ],
}

// Simulated live customer follow-up shown after the seller sends a manual

// reply, so the demo thread feels two-way even while offline.

const SEND_INTENT_RE = /\b(sent|send|deliver(?:ed|ing)?)\b/i

function hasSendIntent(text: string): boolean {
  return SEND_INTENT_RE.test(text)
}

function matchConvoByName(
  convos: { id: string, name: string }[],
  targetName: string,
): string | null {
  const needle = targetName.trim().toLowerCase()
  if (!needle) return null
  const firstWord = needle.split(/\s+/)[0]
  return (
    convos.find((c) => c.name.toLowerCase().includes(needle))?.id ||
    convos.find((c) => c.name.toLowerCase().split(/\s+/)[0] === firstWord)
      ?.id ||
    null
  )
}

function parseCustomerSend(
  text: string,
  convos: { id: string, name: string }[],
): {
  isSendIntent: boolean
  targetId: string | null
  targetName: string | null
  body: string
} {
  const trimmed = text.trim()
  if (!hasSendIntent(trimmed)) {
    return {
      isSendIntent: false,
      targetId: null,
      targetName: null,
      body: trimmed,
    }
  }
  let working = trimmed.replace(/^\s*(please\s+|kindly\s+)/i, "")
  working = working.replace(
    /^(sent|send|deliver|delivered|delivering)\b\s*/i,
    "",
  )
  let targetName: string | null = null
  let body = working
  const toTail = working.match(/^(.*)\s+to\s+([A-Za-z][A-Za-z .]*?)\s*$/)
  if (toTail && toTail[1].trim()) {
    body = toTail[1].trim()
    targetName = toTail[2].trim()
  } else {
    const toHead = working.match(/^to\s+([A-Za-z][A-Za-z .]*?)[:,]?\s+(.+)$/i)
    if (toHead) {
      targetName = toHead[1].trim()
      body = toHead[2].trim()
    }
  }
  body = body.replace(/^(this\s+(message\s+)?|that\s+|it\s*)[:,"']?\s*/i, "")
  body = body.replace(/^[:,"'\s]+|[:,"'\s]+$/g, "")
  const targetId = targetName ? matchConvoByName(convos, targetName) : null
  return { isSendIntent: true, targetId, targetName, body }
}

const THREAD_AUTO_REPLY: Record<string, string> = {
  "1": "Salamat po! Confirm ko po 2kg for pickup today.",

  "2": "Sige po, pa-order po ng 3kg bukas.",

  "3": "Ok po, order ulit ako next week!",
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "??"

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "now"

  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  )

  if (mins < 1) return "now"

  if (mins < 60) return `${mins}m`

  const hours = Math.floor(mins / 60)

  if (hours < 24) return `${hours}h`

  return `${Math.floor(hours / 24)}d`
}

function InboxScreen({
  isLoggedIn,

  onLogin,

  realConvos = [],

  previews = {},

  readIds = [],

  onOpenConversation,
}: {
  isLoggedIn: boolean

  onLogin: () => void

  realConvos?: {
    id: string
    initials: string
    name: string
    message: string
    time: string
    unread: boolean
    psid?: string
  }[]

  previews?: Record<string, string>

  readIds?: string[]

  onOpenConversation?: (id: string) => void
}) {
  const allConvos = [...realConvos, ...DUMMY_CONVOS].map((c) => ({
    ...c,

    message: previews[c.id] || c.message,

    unread: c.unread && !readIds.includes(c.id),
  }))

  const unreadTotal = allConvos.filter((c) => c.unread).length

  return (
    <section className="panel-screen">
      <div className="section-heading">
        <h1>Message</h1>
        <span>{isLoggedIn ? `${unreadTotal} unread` : "0 unread"}</span>
      </div>
      {isLoggedIn ? (
        allConvos.map((convo, index) => (
          <button
            className="conversation min-h-[56px] text-left w-full"
            key={convo.id}
            type="button"
            onClick={() => onOpenConversation?.(convo.id)}
            aria-label={`Open conversation with ${convo.name}`}
          >
            <span className={`avatar conversation-avatar tone-${index % 3}`}>
              {convo.initials}
            </span>
            <span className="conversation-copy">
              <strong>{convo.name}</strong>
              <span>{convo.message}</span>
            </span>
            <span className="conversation-meta">
              {convo.time}
              {convo.unread && <i />}
            </span>
          </button>
        ))
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Icon name="message-circle" size={28} />
          </div>
          <h3>No Conversations</h3>
          <p>
            No customer messages to show. Log in using your Facebook account to
            synchronize inquiries.
          </p>
          <button type="button" className="fb-login-btn" onClick={onLogin}>
            <Icon name="baseline-facebook" size={18} />
            <span>Login using Facebook</span>
          </button>
        </div>
      )}
    </section>
  )
}

function merchantDeliveryLabel(m: ThreadMsg): string {
  if (m.status === "sending") return "Sending…"

  if (m.status === "seen") return "Seen · live"

  if (m.status === "sent-live") return "Sent · live"

  return `${m.time} · You`
}

function ConversationThread({
  convoName,

  convoInitials,

  messages,

  replyText,

  sending = false,

  customerTyping = false,

  onReplyChange,

  onSend,

  onBack,
}: {
  convoName: string

  convoInitials: string

  messages: ThreadMsg[]

  replyText: string

  sending?: boolean

  customerTyping?: boolean

  onReplyChange: (text: string) => void

  onSend: () => void

  onBack: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const firstName = convoName.split(" ")[0]

  const liveDraft = replyText.trim()

  useEffect(() => {
    const list = listRef.current

    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages, customerTyping, liveDraft])

  return (
    <section className="panel-screen thread-screen">
      <div className="thread-header">
        <button
          type="button"
          className="thread-back-btn"
          onClick={onBack}
          aria-label={`Back to messages`}
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <span className="avatar conversation-avatar tone-0">
          {convoInitials}
        </span>
        <div className="thread-header-copy">
          <strong>{convoName}</strong>
          <span className="thread-live-badge">
            <span className="thread-live-dot" />
            Live · Messenger sync
          </span>
        </div>
      </div>

      <div
        className="thread-messages-list"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${convoName}`}
        ref={listRef}
      >
        {messages.map((m) =>
          m.from === "merchant" ? (
            <div key={m.id} className="chat-bubble-row user-row">
              <div className="chat-bubble user-bubble">
                <p className="chat-bubble-text">{m.text}</p>
                <span
                  className={`chat-bubble-time delivery-status ${
                    m.status ? `delivery-${m.status}` : ""
                  }`}
                >
                  {merchantDeliveryLabel(m)}
                </span>
              </div>
            </div>
          ) : (
            <div key={m.id} className="chat-bubble-row mume-row">
              <div className="chat-bubble mume-bubble">
                <p className="chat-bubble-text">{m.text}</p>
                <span className="chat-bubble-time">{m.time}</span>
              </div>
            </div>
          ),
        )}
        {/* Live mirror: what the customer sees the instant the merchant types. */}
        {liveDraft && (
          <div className="live-preview-row" aria-hidden="true">
            <span className="live-preview-label">
              <span className="live-preview-dot" />
              Customer sees live
            </span>
            <div className="chat-bubble live-preview-bubble">
              <p className="chat-bubble-text">{liveDraft}</p>
            </div>
          </div>
        )}
        {customerTyping && (
          <div className="chat-bubble-row mume-row">
            <div className="chat-bubble mume-bubble thinking-bubble">
              <span className="thinking-dot" />
              <span className="thinking-text">{firstName} is typing…</span>
            </div>
          </div>
        )}
      </div>

      <div className="manual-reply-bar">
        <input
          type="text"
          className="manual-reply-input"
          placeholder={`Reply to ${convoName.split(" ")[0]} manually…`}
          value={replyText}
          onChange={(e) => onReplyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()

              onSend()
            }
          }}
          aria-label={`Manual reply to ${convoName}`}
        />
        <button
          type="button"
          className={`manual-send-btn ${replyText.trim() ? "active" : ""}`}
          onClick={onSend}
          disabled={!replyText.trim() || sending}
          aria-label="Send manual reply to customer"
        >
          <Icon name="send" size={16} />
          <span>{sending ? "Sending…" : "Send"}</span>
        </button>
      </div>
      <p className="thread-hint">
        Manual reply — sends live to the customer thread.
      </p>
    </section>
  )
}

function CatalogScreen({
  isLoggedIn,

  onLogin,

  products,

  onOpenEditProduct,

  onOpenCreateProduct,
}: {
  isLoggedIn: boolean

  onLogin: () => void

  products: Product[]

  onOpenEditProduct: (product: Product) => void

  onOpenCreateProduct: () => void
}) {
  return (
    <section className="panel-screen">
      <div className="section-heading flex items-center justify-between">
        <div>
          <h1>Catalog & Inventory</h1>
          <span>
            {isLoggedIn ? `${products.length} products` : "0 products"}
          </span>
        </div>
      </div>
      {isLoggedIn ? (
        products.length === 0 ? (
          <div className="empty-catalog-box">
            <p className="font-semibold text-gray-800">
              No products in catalog
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click the "+" button below to create an item.
            </p>
          </div>
        ) : (
          <div className="catalog-grid">
            {products.map((item) => (
              <button
                className="product-card min-h-[140px]"
                key={item.id}
                type="button"
                onClick={() => onOpenEditProduct(item)}
              >
                <div className="product-image-container relative w-full">
                  <img
                    src={
                      item.imageUri ||
                      FRUIT_IMAGE_MAP[
                        (item.imageKey as "apple" | "mango" | "banana")
                      ] ||
                      appleImg
                    }
                    alt={item.name}
                    className="product-image"
                  />
                  <span
                    className={`stock-badge ${
                      item.stock === "In stock"
                        ? "stock-in"
                        : item.stock === "Low stock"
                          ? "stock-low"
                          : "stock-out"
                    }`}
                  >
                    {item.stock}
                  </span>
                </div>
                <strong>{item.name}</strong>
                <span className="flex items-center justify-center gap-1 text-sm font-bold text-blue-600">
                  <Icon name="dollar-sign" size={14} />
                  {item.price}
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Icon name="folder" size={28} />
          </div>
          <h3>Catalog is Empty</h3>
          <p>
            No products found. Log in using your Facebook account to link and
            manage your store inventory.
          </p>
          <button type="button" className="fb-login-btn" onClick={onLogin}>
            <Icon name="baseline-facebook" size={18} />
            <span>Login using Facebook</span>
          </button>
        </div>
      )}
    </section>
  )
}

/** Handle for an in-progress browser microphone capture. */

interface WebCapture {
  ctx: AudioContext

  source: MediaStreamAudioSourceNode

  proc: ScriptProcessorNode

  chunks: Float32Array[]

  sampleRate: number

  micStream: MediaStream

  recognition?: any

  getBrowserTranscript?: () => string
}

/** Plays a subtle two-note earcon when toggling the mic on or off. */

function playWebEarcon(kind: "on" | "off") {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext

    if (!Ctor) return

    const ctx: AudioContext = new Ctor()

    const now = ctx.currentTime

    const osc = ctx.createOscillator()

    const gain = ctx.createGain()

    osc.type = "sine"

    if (kind === "on") {
      osc.frequency.setValueAtTime(520, now)

      osc.frequency.exponentialRampToValueAtTime(740, now + 0.09)
    } else {
      osc.frequency.setValueAtTime(680, now)

      osc.frequency.exponentialRampToValueAtTime(440, now + 0.09)
    }

    gain.gain.setValueAtTime(0.06, now)

    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)

    osc.connect(gain)

    gain.connect(ctx.destination)

    osc.start(now)

    osc.stop(now + 0.12)

    osc.onended = () => {
      ctx.close().catch(() => {})
    }
  } catch {
    // Best-effort earcon only.
  }
}

/**
 * Resamples captured browser audio to 24 kHz mono 16-bit PCM and encodes
 * a WAV file as base64: the exact format the transcription endpoint takes.
 */

function encodeWavBase64(
  chunks: Float32Array[],
  fromRate: number,
  toRate = 24000,
): string {
  let total = 0

  for (const c of chunks) total += c.length

  const pcm = new Float32Array(total)

  let o = 0

  for (const c of chunks) {
    pcm.set(c, o)

    o += c.length
  }

  const outLen = Math.max(1, Math.floor((total * toRate) / fromRate))

  const data = new Int16Array(outLen)

  for (let i = 0; i < outLen; i++) {
    const pos = (i * fromRate) / toRate

    const i0 = Math.floor(pos)

    const frac = pos - i0

    const a = pcm[Math.min(i0, total - 1)] || 0

    const b = pcm[Math.min(i0 + 1, total - 1)] || 0

    const v = Math.max(-1, Math.min(1, a + (b - a) * frac))

    data[i] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767)
  }

  const buffer = new ArrayBuffer(44 + outLen * 2)

  const v = new DataView(buffer)

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
  }

  writeStr(0, "RIFF")

  v.setUint32(4, 36 + outLen * 2, true)

  writeStr(8, "WAVE")

  writeStr(12, "fmt ")

  v.setUint32(16, 16, true)

  v.setUint16(20, 1, true)

  v.setUint16(22, 1, true)

  v.setUint32(24, toRate, true)

  v.setUint32(28, toRate * 2, true)

  v.setUint16(32, 2, true)

  v.setUint16(34, 16, true)

  writeStr(36, "data")

  v.setUint32(40, outLen * 2, true)

  new Int16Array(buffer, 44).set(data)

  const bytes = new Uint8Array(buffer)

  const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  let out = ""

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]

    const b = i + 1 < bytes.length ? bytes[i + 1] : 0

    const c = i + 2 < bytes.length ? bytes[i + 2] : 0

    out += CH[a >> 2] + CH[((a & 3) << 4) | (b >> 4)]

    out += i + 1 < bytes.length ? CH[((b & 15) << 2) | (c >> 6)] : "="

    out += i + 2 < bytes.length ? CH[c & 63] : "="
  }

  return out
}

async function startWebCapture(): Promise<WebCapture> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not available in this browser")
  }

  let micStream: MediaStream

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,

        noiseSuppression: true,

        autoGainControl: true,
      },
    })
  } catch {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  }

  const liveTrack = micStream.getAudioTracks()[0]

  if (!liveTrack || liveTrack.readyState !== "live") {
    micStream.getTracks().forEach((t) => t.stop())

    throw new Error("Microphone is not available in this browser")
  }

  const Ctor = window.AudioContext || (window as any).webkitAudioContext

  const ctx: AudioContext = new Ctor()

  try {
    await ctx.resume()
  } catch {
    // Handled by ctx.state check below.
  }

  if (ctx.state !== "running") {
    micStream.getTracks().forEach((t) => t.stop())

    try {
      await ctx.close()
    } catch {
      // Already closed.
    }

    throw new Error("Microphone is not available in this browser")
  }

  const source = ctx.createMediaStreamSource(micStream)

  const proc = ctx.createScriptProcessor(4096, 1, 1)

  const chunks: Float32Array[] = []

  proc.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
  }

  source.connect(proc)

  const silent = ctx.createGain()

  silent.gain.value = 0

  proc.connect(silent)

  silent.connect(ctx.destination)

  let recognition: any = null

  const finalParts: string[] = []

  let interimPart = ""

  try {
    const isMobileUa = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent || "",
    )

    const SpeechRec =
      !isMobileUa &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition)

    if (SpeechRec) {
      recognition = new SpeechRec()

      recognition.continuous = true

      recognition.interimResults = true

      recognition.lang = navigator.language || "en-US"

      recognition.onresult = (ev: any) => {
        let interim = ""

        for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
          const res = ev.results[i]

          const txt = String(res?.[0]?.transcript || "").trim()

          if (!txt) continue

          if (res.isFinal) finalParts.push(txt)
          else interim += (interim ? " " : "") + txt
        }

        interimPart = interim
      }

      recognition.onerror = () => {}

      recognition.start()
    }
  } catch {
    recognition = null
  }

  return {
    ctx,

    source,

    proc,

    chunks,

    sampleRate: ctx.sampleRate,

    micStream,

    recognition,

    getBrowserTranscript: () =>
      [...finalParts, interimPart].filter(Boolean).join(" ").trim(),
  }
}

async function stopWebCapture(
  cap: WebCapture,
): Promise<{ base64: string, browserTranscript: string }> {
  try {
    cap.proc.disconnect()
  } catch {
    // Already torn down.
  }

  try {
    cap.source.disconnect()
  } catch {
    // Already torn down.
  }

  try {
    cap.micStream.getTracks().forEach((t) => t.stop())
  } catch {
    // Tracks already stopped.
  }

  if (cap.recognition) {
    await new Promise<void>((resolve) => {
      const done = () => resolve()

      const timer = window.setTimeout(done, 250)

      try {
        cap.recognition.onend = () => {
          window.clearTimeout(timer)

          done()
        }

        cap.recognition.stop()
      } catch {
        window.clearTimeout(timer)

        done()
      }
    })
  }

  const base64 = encodeWavBase64(cap.chunks, cap.sampleRate)

  cap.ctx.close().catch(() => {})

  const browserTranscript = cap.getBrowserTranscript
    ? cap.getBrowserTranscript()
    : ""

  return { base64, browserTranscript }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  const [activeTab, setActiveTab] = useState<Tab>("home")

  const [menuOpen, setMenuOpen] = useState(false)

  const [voiceState, setVoiceState] = useState<VoiceState>("idle")

  const [voiceError, setVoiceError] = useState<string>("")

  const voiceErrorTimerRef = useRef<number | null>(null)

  const webRecRef = useRef<WebCapture | null>(null)

  const voiceRecordStartedAt = useRef<number>(0)

  const showVoiceError = useCallback((msg: string) => {
    setVoiceError(msg)

    if (voiceErrorTimerRef.current !== null) {
      window.clearTimeout(voiceErrorTimerRef.current)

      voiceErrorTimerRef.current = null
    }

    if (msg) {
      voiceErrorTimerRef.current = window.setTimeout(() => {
        setVoiceError("")
      }, 5000)
    }
  }, [])

  const [userName, setUserName] = useState<string>("Jefferson")

  const [isLoggedIn, setIsLoggedIn] = useState(true)

  const [sent, setSent] = useState(false)

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null)

  const [realInboxConvos, setRealInboxConvos] = useState<{
    id: string
    initials: string
    name: string
    message: string
    time: string
    unread: boolean
    psid?: string
  }[]>([])

  const [realPendingActions, setRealPendingActions] = useState<any[]>([])

  const [linkedPageId, setLinkedPageId] = useState<string | null>(null)

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  const [threadMsgs, setThreadMsgs] =
    useState<Record<string, ThreadMsg[]>>(THREAD_SEED)

  const [threadPreviews, setThreadPreviews] = useState<Record<string, string>>(
    {},
  )

  const [threadReadIds, setThreadReadIds] = useState<string[]>([])

  const [capsuleTargetId, setCapsuleTargetId] = useState<string | null>(null)
  const [manualReplyText, setManualReplyText] = useState("")

  const [manualSending, setManualSending] = useState(false)

  const [customerTypingId, setCustomerTypingId] = useState<string | null>(null)

  const [sentLabel, setSentLabel] = useState("Reply sent to Maria")

  const customerReplyTimerRef = useRef<number | null>(null)

  const [chatInput, setChatInput] = useState("")

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",

      sender: "mume",

      text: "Hi Jefferson! I'm Mume, your store assistant. You can write any message to me here or tap mic to talk.",

      time: "Just now",
    },
  ])

  const [isAiThinking, setIsAiThinking] = useState(false)

  const [isInputFocused, setIsInputFocused] = useState(false)

  const [isTyping, setIsTyping] = useState(false)

  const typingTimeoutRef = useRef<any>(null)

  const chatCardRef = useRef<HTMLDivElement | null>(null)

  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const contentScrollRef = useRef<HTMLDivElement | null>(null)

  const [isEditingActionDraft, setIsEditingActionDraft] = useState(false)

  // Blue highlight triggers only when user is actively typing or dictating via voice

  const isChattingOrTyping = isTyping || voiceState === "listening"

  const adjustConversationPosition = useCallback(
    (smooth = true) => {
      if (chatCardRef.current && contentScrollRef.current) {
        const container = contentScrollRef.current

        const card = chatCardRef.current

        const containerRect = container.getBoundingClientRect()

        const cardRect = card.getBoundingClientRect()

        // Measure relative top distance from container's visible top to the conversation card

        const relativeTop = cardRect.top - containerRect.top

        const targetOffset = 16 // 16px below header

        const diff = relativeTop - targetOffset

        // Adjust scroll position smoothly so the conversation card stays directly in view

        if (Math.abs(diff) > 20) {
          container.scrollBy({
            top: diff,

            behavior: smooth ? "smooth" : "auto",
          })
        }
      }

      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,

          behavior: smooth ? "smooth" : "auto",
        })
      }
    },
    [],
  )

  const handleTyping = (text: string) => {
    setChatInput(text)

    if (text.length > 0) {
      setIsTyping(true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Highlight vanishes after user pauses/stops typing

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)

      // Keep conversation in view and following while typing

      adjustConversationPosition(true)
    } else {
      setIsTyping(false)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Pro Subscription Upgrade modal state

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)

  const [isProUser, setIsProUser] = useState(false)

  const [proToast, setProToast] = useState(false)

  const proAutoCloseTimerRef = useRef<number | null>(null)

  const closeSubscriptionModal = useCallback(() => {
    if (proAutoCloseTimerRef.current !== null) {
      window.clearTimeout(proAutoCloseTimerRef.current)

      proAutoCloseTimerRef.current = null
    }

    setSubscriptionModalOpen(false)
  }, [])

  useEffect(() => {
    const splashTimer = window.setTimeout(
      () => {
        setShowSplash(false)

        // Auto-show Pro upgrade modal on the home screen for 3 seconds right after the 3s splash

        setSubscriptionModalOpen(true)

        proAutoCloseTimerRef.current = window.setTimeout(() => {
          setSubscriptionModalOpen(false)

          proAutoCloseTimerRef.current = null
        }, 3000)
      },
      3000,
    )

    return () => {
      window.clearTimeout(splashTimer)

      if (proAutoCloseTimerRef.current !== null) {
        window.clearTimeout(proAutoCloseTimerRef.current)
      }
    }
  }, [])

  // Load persistent chat history from Supabase / API and subscribe to real-time messages

  useEffect(() => {
    let isMounted = true

    async function loadInboxAndChat() {
      try {
        const linkedPages = await api.getLinkedPages()

        const pageId = linkedPages[0]?.id

        if (isMounted && pageId) setLinkedPageId(pageId)

        try {
          const actions = await api.getPendingActions(pageId)

          if (isMounted && Array.isArray(actions))
            setRealPendingActions(actions)
        } catch {
          // No live approval cards; the card falls back to demo content.
        }

        const fbPageIdStr = String(linkedPages[0]?.fb_page_id || "")

        if (isMounted && pageId) {
          const convs = await api.getPageConversations(pageId)

          if (isMounted && convs.length > 0) {
            const latestByConv: Record<string, any> = {}

            for (const c of convs) {
              if (c.latest_message) {
                latestByConv[c.id] = c.latest_message
              }
            }

            if (Object.keys(latestByConv).length < convs.length) {
              try {
                const inboxData = await api.getPageInbox(pageId, 10)

                for (const gt of inboxData?.conversations || []) {
                  const senders = gt.senders?.data || []

                  const customer =
                    senders.find((s: any) => String(s.id) !== fbPageIdStr) ||
                    senders[0]

                  if (!customer?.id) continue

                  const matchConv = convs.find(
                    (c: any) => String(c.customer_psid) === String(customer.id),
                  )

                  if (!matchConv) continue

                  const threadMsgs = await api.getPageThreadMessages(
                    pageId,
                    gt.id,
                    5,
                  )

                  if (threadMsgs && threadMsgs.length > 0) {
                    const latestGm = threadMsgs[0]

                    latestByConv[matchConv.id] = {
                      text: latestGm.message,

                      created_at: latestGm.created_time,

                      is_from_customer:
                        String(latestGm.from?.id) === String(customer.id),
                    }
                  }
                }
              } catch {
                // Ignore Graph fallback errors
              }
            }

            if (isMounted) {
              setRealInboxConvos(
                convs.map((c: any) => {
                  const name = c.customer_name || "Customer"

                  const latest = latestByConv[c.id] || c.latest_message

                  return {
                    id: c.id,

                    name,

                    initials: initialsOf(name),

                    message:
                      latest?.text || c.last_message_text || "New conversation",

                    time: timeAgo(latest?.created_at || c.last_message_at),

                    unread:
                      typeof c.unread === "boolean"
                        ? c.unread
                        : !!latest?.is_from_customer,

                    psid: c.customer_psid,
                  }
                }),
              )
            }
          }
        }
      } catch (inboxErr) {
        console.warn("Web companion inbox sync skipped:", inboxErr)
      }

      try {
        const chatData = await api.getChatMessages()

        if (isMounted && chatData?.messages && chatData.messages.length > 0) {
          setActiveConversationId(chatData.conversationId)

          setChatMessages(chatData.messages)

          return
        }
      } catch (apiErr) {
        console.warn(
          "Backend chat API offline, checking Supabase directly:",
          apiErr,
        )
      }

      // Supabase direct fallback

      try {
        const { data: conv } = await supabase

          .from("conversations")

          .select("id")

          .eq("customer_psid", "mume_assistant")

          .maybeSingle()

        if (conv && isMounted) {
          setActiveConversationId(conv.id)

          const { data: msgs } = await supabase

            .from("messages")

            .select("id, sender, text, created_at")

            .eq("conversation_id", conv.id)

            .order("created_at", { ascending: true })

          if (msgs && msgs.length > 0 && isMounted) {
            setChatMessages(
              msgs.map((m) => ({
                id: m.id,

                sender: m.sender === "mume" ? "mume" : "user",

                text: m.text,

                time: new Date(m.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })),
            )
          }
        }
      } catch (sbErr) {
        console.warn("Supabase direct query failed:", sbErr)
      }
    }

    loadInboxAndChat()

    // Subscribe to real-time messages across Supabase Realtime CDC

    const channel = supabase

      .channel("web_realtime_chat")

      .on(
        "postgres_changes",

        { event: "INSERT", schema: "public", table: "messages" },

        (payload) => {
          const newMsg = payload.new as any

          if (!newMsg) return

          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev

            return [
              ...prev,

              {
                id: newMsg.id,

                sender: newMsg.sender === "mume" ? "mume" : "user",

                text: newMsg.text,

                time: new Date(newMsg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]
          })

          setTimeout(() => adjustConversationPosition(true), 50)
        },
      )

      .subscribe()

    return () => {
      isMounted = false

      supabase.removeChannel(channel)
    }
  }, [adjustConversationPosition])

  // Products / Catalog state

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [productForm, setProductForm] = useState<{
    name: string

    price: string

    stock: "In stock" | "Low stock" | "Out of stock"

    imageKey: "apple" | "mango" | "banana" | "custom"

    imageUri?: string
  }>({
    name: "",

    price: "",

    stock: "In stock",

    imageKey: "apple",

    imageUri: undefined,
  })

  const handlePickCustomImage = () => {
    const input = document.createElement("input")

    input.type = "file"

    input.accept = "image/*"

    input.style.position = "fixed"

    input.style.top = "-1000px"

    input.style.left = "-1000px"

    input.style.opacity = "0"

    document.body.appendChild(input)

    input.onchange = (e: any) => {
      const file = e.target?.files?.[0]

      if (file) {
        const reader = new FileReader()

        reader.onload = (event) => {
          const result = event.target?.result as string

          if (result) {
            setProductForm((prev) => ({
              ...prev,

              imageUri: result,

              imageKey: "custom",
            }))
          }
        }

        reader.readAsDataURL(file)
      }

      try {
        document.body.removeChild(input)
      } catch {}
    }

    input.click()
  }

  const handleOpenEditProduct = (prod: Product) => {
    setSelectedProduct(prod)

    setProductForm({
      name: prod.name,

      price: prod.price,

      stock: prod.stock,

      imageKey: prod.imageKey || "apple",

      imageUri: prod.imageUri,
    })
  }

  const handleSaveProductEdit = () => {
    if (!selectedProduct) return

    const trimmed = productForm.name.trim()

    if (!trimmed) return

    setProducts((prev) =>
      prev.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,

              name: trimmed,

              price: productForm.price.trim() || "$0 / kg",

              stock: productForm.stock,

              isStock: productForm.stock === "In stock",

              imageKey: productForm.imageKey,

              imageUri:
                productForm.imageKey === "custom"
                  ? productForm.imageUri
                  : undefined,
            }
          : item,
      ),
    )

    setSelectedProduct(null)
  }

  const handleDeleteProduct = () => {
    if (!selectedProduct) return

    setProducts((prev) => prev.filter((item) => item.id !== selectedProduct.id))

    setSelectedProduct(null)
  }

  const handleOpenCreateProduct = () => {
    setProductForm({
      name: "",

      price: "$",

      stock: "In stock",

      imageKey: "apple",

      imageUri: undefined,
    })

    setIsCreateModalOpen(true)
  }

  const handleSaveCreateProduct = () => {
    const trimmed = productForm.name.trim()

    if (!trimmed) return

    const newProd: Product = {
      id: `prod-${Date.now()}`,

      name: trimmed,

      price: productForm.price.trim() || "$0 / kg",

      stock: productForm.stock,

      isStock: productForm.stock === "In stock",

      imageKey: productForm.imageKey,

      imageUri:
        productForm.imageKey === "custom" ? productForm.imageUri : undefined,
    }

    setProducts((prev) => [...prev, newProd])

    setIsCreateModalOpen(false)
  }

  const handleSendMessage = async (sendText?: string) => {
    const trimmed = (typeof sendText === "string" ? sendText : chatInput).trim()

    if (!trimmed || isAiThinking) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setIsTyping(false)

    const tempUserId = `user-${Date.now()}`

    const userMsg: ChatMessage = {
      id: tempUserId,

      sender: "user",

      text: trimmed,

      time: "Just now",
    }

    setChatMessages((prev) => [...prev, userMsg])

    setChatInput("")

    setIsAiThinking(true)

    if (activeTab !== "home") {
      setActiveTab("home")
    }

    setTimeout(() => adjustConversationPosition(true), 50)

    try {
      // 1. Send via Backend API (persists in Supabase)

      const res = await api.sendChatMessage(trimmed, linkedPageId || undefined)

      if (res?.aiMessage) {
        setChatMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempUserId)

          return [
            ...withoutTemp,

            {
              id: res.userMessage.id,

              sender: "user",

              text: res.userMessage.text,

              time: "Just now",
            },

            {
              id: res.aiMessage.id,

              sender: "mume",

              text: res.aiMessage.text,

              time: "Just now",
            },
          ]
        })
      }
    } catch {
      // 2. Direct Supabase persistence fallback

      const reply = getMumeAiReply(trimmed)

      try {
        let convId = activeConversationId

        if (!convId) {
          const { data: firstPage } = await supabase
            .from("pages")
            .select("id")
            .limit(1)
            .maybeSingle()

          if (firstPage) {
            const { data: conv } = await supabase

              .from("conversations")

              .upsert(
                {
                  page_id: firstPage.id,

                  customer_psid: "mume_assistant",

                  customer_name: "Mume AI Assistant",

                  last_message_at: new Date().toISOString(),
                },

                { onConflict: "page_id,customer_psid" },
              )

              .select("id")

              .single()

            convId = conv?.id || null

            if (convId) setActiveConversationId(convId)
          }
        }

        if (convId) {
          const { data: uMsg } = await supabase

            .from("messages")

            .insert({
              conversation_id: convId,

              sender: "user",

              text: trimmed,

              is_from_customer: false,
            })

            .select()

            .single()

          const { data: aMsg } = await supabase

            .from("messages")

            .insert({
              conversation_id: convId,

              sender: "mume",

              text: reply,

              is_from_customer: false,
            })

            .select()

            .single()

          if (uMsg && aMsg) {
            setChatMessages((prev) => {
              const withoutTemp = prev.filter((m) => m.id !== tempUserId)

              return [
                ...withoutTemp,

                {
                  id: uMsg.id,
                  sender: "user",
                  text: uMsg.text,
                  time: "Just now",
                },

                {
                  id: aMsg.id,
                  sender: "mume",
                  text: aMsg.text,
                  time: "Just now",
                },
              ]
            })

            return
          }
        }
      } catch (persistErr) {
        console.warn("Direct Supabase persistence warning:", persistErr)
      }

      // 3. In-memory fallback if network completely offline

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,

        sender: "mume",

        text: reply,

        time: "Just now",
      }

      setChatMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsAiThinking(false)

      setTimeout(() => adjustConversationPosition(true), 50)
    }
  }

  const allConvos = [...realInboxConvos, ...DUMMY_CONVOS]

  const resolveCapsuleTargetId = (explicitId: string | null): string | null => {
    if (explicitId && allConvos.some((c) => c.id === explicitId))
      return explicitId
    if (capsuleTargetId && allConvos.some((c) => c.id === capsuleTargetId))
      return capsuleTargetId
    if (selectedThreadId && allConvos.some((c) => c.id === selectedThreadId))
      return selectedThreadId
    return allConvos.find((c) => c.unread)?.id || allConvos[0]?.id || null
  }

  const deliverToCustomer = async (
    threadId: string,
    body: string,
    via: "manual" | "capsule",
  ) => {
    const trimmed = body.trim()
    if (!trimmed) return
    const merchantMsg: ThreadMsg = {
      id: `${via}-${Date.now()}`,
      from: "merchant",
      text: trimmed,
      time: "Just now",
      status: "sending",
      via,
    }
    setThreadMsgs((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), merchantMsg],
    }))
    setThreadPreviews((prev) => ({ ...prev, [threadId]: trimmed }))

    try {
      const real = realInboxConvos.find((c) => c.id === threadId)
      if (linkedPageId && real?.psid) {
        await api.replyToCustomer(linkedPageId, {
          psid: real.psid,
          text: trimmed,
          lastCustomerMessageAt: new Date().toISOString(),
        })
      }
    } catch {
      // Local thread update above already shows the live change.
    }

    setThreadMsgs((prev) => ({
      ...prev,
      [threadId]: (prev[threadId] || []).map((m) =>
        m.id === merchantMsg.id ? { ...m, status: "sent-live" as const } : m,
      ),
    }))

    const threadName =
      allConvos.find((c) => c.id === threadId)?.name || "Customer"
    setSentLabel(`Sent to ${threadName} · live`)
    setSent(true)
    window.setTimeout(() => setSent(false), 3500)

    if (customerReplyTimerRef.current !== null) {
      window.clearTimeout(customerReplyTimerRef.current)
    }
    setCustomerTypingId(threadId)
    customerReplyTimerRef.current = window.setTimeout(() => {
      const echo: ThreadMsg = {
        id: `echo-${Date.now()}`,
        from: "customer",
        text: THREAD_AUTO_REPLY[threadId] || "Salamat po! Noted po.",
        time: "Just now",
      }
      setThreadMsgs((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), echo],
      }))
      setThreadPreviews((prev) => ({ ...prev, [threadId]: echo.text }))
      setCustomerTypingId((cur) => (cur === threadId ? null : cur))
      customerReplyTimerRef.current = null
    }, 2400)
  }

  const routeCapsuleText = async (raw: string): Promise<boolean> => {
    const parsed = parseCustomerSend(raw, allConvos)
    if (!parsed.isSendIntent) return false
    const targetId = resolveCapsuleTargetId(parsed.targetId)
    if (!targetId) {
      showVoiceError("No customer thread to send to yet.")
      return true
    }
    if (!parsed.body) {
      const fallbackName =
        allConvos.find((c) => c.id === targetId)?.name || "customer"
      showVoiceError(`Write the message to send to ${fallbackName}.`)
      return true
    }
    setChatInput("")
    setIsTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    await deliverToCustomer(targetId, parsed.body, "capsule")
    return true
  }

  const handleCapsuleSend = async (sendText?: string) => {
    const raw = (typeof sendText === "string" ? sendText : chatInput).trim()
    if (!raw || isAiThinking) return
    // "Send / deliver ..." routes live to the customer thread; anything else asks AI.
    if (await routeCapsuleText(raw)) return
    await handleSendMessage(raw)
  }

  const userInitials = isLoggedIn
    ? userName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0]?.toUpperCase())
        .slice(0, 2)
        .join("") || "JS"
    : "?"

  useEffect(() => {
    return () => {
      if (voiceErrorTimerRef.current !== null) {
        window.clearTimeout(voiceErrorTimerRef.current)
      }

      if (webRecRef.current) {
        stopWebCapture(webRecRef.current).catch(() => {})

        webRecRef.current = null
      }
    }
  }, [])

  const handleVoice = async () => {
    if (voiceState === "thinking") return

    if (voiceState === "idle") {
      showVoiceError("")

      try {
        playWebEarcon("on")

        webRecRef.current = await startWebCapture()

        voiceRecordStartedAt.current = Date.now()

        setVoiceState("listening")
      } catch (err: any) {
        const msg = err?.message || "Microphone access denied"

        console.warn("Voice record start failed:", msg)

        showVoiceError(msg)
      }

      return
    }

    const elapsedMs = Date.now() - voiceRecordStartedAt.current

    try {
      setVoiceState("thinking")

      playWebEarcon("off")

      const cap = webRecRef.current

      webRecRef.current = null

      if (elapsedMs < 1000) {
        if (cap) await stopWebCapture(cap)

        const secs = (elapsedMs / 1000).toFixed(1)

        throw new Error(
          `That tap was too short (${secs}s) — tap mic, speak, then tap again.`,
        )
      }

      if (!cap || cap.chunks.length === 0) {
        throw new Error("No recording captured")
      }

      const { base64, browserTranscript } = await stopWebCapture(cap)

      const approxBytes = Math.floor((base64.length * 3) / 4)

      if (approxBytes < 4096 && !browserTranscript) {
        throw new Error(
          `Mic captured only ${approxBytes} bytes — check microphone access and try again.`,
        )
      }

      let transcribedText = ""

      try {
        const { text } = await api.transcribeVoice({ audio: base64 })

        transcribedText = (text || "").trim()
      } catch (apiErr: any) {
        if (browserTranscript.trim()) {
          transcribedText = browserTranscript.trim()
        } else {
          throw apiErr
        }
      }

      if (!transcribedText && browserTranscript.trim()) {
        transcribedText = browserTranscript.trim()
      }

      if (!transcribedText) {
        throw new Error("Couldn't hear that — try again.")
      }

      // Voice "send / deliver ..." commands go live to the customer thread.

      if (await routeCapsuleText(transcribedText)) {
        return
      }

      await handleSendMessage(transcribedText)
    } catch (err: any) {
      const msg = err?.message || "Voice transcription failed"

      console.warn("Voice transcribe failed:", msg)

      showVoiceError(msg)
    } finally {
      setVoiceState("idle")
    }
  }

  const [isApproved, setIsApproved] = useState(false)

  const [showApprovedCard, setShowApprovedCard] = useState(false)

  const handleApproved = async (sentText: string) => {
    const action = realPendingActions[0]

    const targetName = action?.customer_name || "Maria"

    let remaining = realPendingActions

    let delivered = false

    let failureReason: string | null = null

    if (action?.id) {
      try {
        const result: any = await api.approvePendingAction(action.id, sentText)

        delivered = !!(
          result &&
          result.status === "sent" &&
          result.graphResult &&
          result.graphResult.message_id
        )

        if (delivered) {
          remaining = realPendingActions.filter((a) => a.id !== action.id)

          setRealPendingActions(remaining)
        } else {
          failureReason =
            result?.warning ||
            result?.error ||
            "Messenger dispatch did not confirm delivery."
        }
      } catch (approveErr) {
        console.warn("Approve via API failed:", approveErr)

        failureReason =
          approveErr instanceof Error
            ? approveErr.message
            : "Approve request failed."
      }
    } else {
      remaining = []
    }

    if (delivered || !action?.id) {
      if (remaining.length === 0) {
        setIsApproved(true)

        setShowApprovedCard(true)

        window.setTimeout(() => setShowApprovedCard(false), 2000)
      }

      setSentLabel(`Reply sent to ${targetName}`)
    } else {
      setSentLabel(
        `Approved \u2014 NOT delivered to Messenger: ${failureReason || "unknown error."}`,
      )
    }

    setSent(true)

    window.setTimeout(() => setSent(false), 3500)
  }

  const selectedThread =
    [...realInboxConvos, ...DUMMY_CONVOS].find(
      (c) => c.id === selectedThreadId,
    ) || null

  const handleOpenThread = (id: string) => {
    setSelectedThreadId(id)

    setThreadReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))

    setManualReplyText("")

    setCustomerTypingId(null)

    if (customerReplyTimerRef.current !== null) {
      window.clearTimeout(customerReplyTimerRef.current)

      customerReplyTimerRef.current = null
    }
  }

  const handleCloseThread = () => {
    setSelectedThreadId(null)

    setManualReplyText("")

    setCustomerTypingId(null)

    if (customerReplyTimerRef.current !== null) {
      window.clearTimeout(customerReplyTimerRef.current)

      customerReplyTimerRef.current = null
    }
  }

  const handleSendManualReply = async () => {
    const trimmed = manualReplyText.trim()

    if (!trimmed || manualSending || !selectedThreadId) return

    const threadId = selectedThreadId

    setManualSending(true)

    setManualReplyText("")

    try {
      await deliverToCustomer(threadId, trimmed, "manual")
    } finally {
      setManualSending(false)
    }
  }

  useEffect(() => {
    return () => {
      if (customerReplyTimerRef.current !== null) {
        window.clearTimeout(customerReplyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "inbox" && selectedThreadId !== null) {
      setSelectedThreadId(null)

      setManualReplyText("")

      setCustomerTypingId(null)
    }
  }, [activeTab, selectedThreadId])

  const handleLogout = () => {
    setIsLoggedIn(false)

    setUserName("")

    setIsApproved(false)

    setShowApprovedCard(false)

    setMenuOpen(false)
  }

  const handleLogin = () => {
    setIsLoggedIn(true)

    setUserName("Jefferson")

    setIsApproved(false)

    setShowApprovedCard(false)

    setMenuOpen(false)
  }

  const capsuleParsed = chatInput.trim()
    ? parseCustomerSend(chatInput, allConvos)
    : null

  const capsuleSendTargetName =
    capsuleParsed?.isSendIntent && capsuleParsed.body
      ? allConvos.find(
          (c) => c.id === resolveCapsuleTargetId(capsuleParsed.targetId),
        )?.name || null
      : null

  return (
    <div className="app-shell">
      <main className="phone-stage max-w-[412px] min-w-[360px] mx-auto border-x border-[var(--line)] shadow-2xl relative">
        {/* Opening Splash Animation (0.8s) */}
        {showSplash && (
          <div className="mume-splash-screen" aria-label="Mume">
            <div className="mume-splash-backdrop" />
            <div className="mume-splash-logo-container">
              <img
                src={mumeBlackSvg}
                alt="Mume"
                className="mume-splash-logo mume-splash-logo-black"
              />
              <img
                src={mumeWhiteSvg}
                alt="Mume"
                className="mume-splash-logo mume-splash-logo-white"
              />
            </div>
          </div>
        )}

        {/* Dynamic Top Header */}
        <Header
          title={
            activeTab === "settings"
              ? "Settings"
              : activeTab === "inbox"
                ? "Message"
                : activeTab === "catalog"
                  ? "Catalog"
                  : "Mume"
          }
          subtitle={isLoggedIn ? "Mume Fresh - Fruit Store" : "No Store Linked"}
          showBack={activeTab !== "home"}
          userInitials={userInitials}
          onBack={() => setActiveTab("home")}
          onMenuClick={() => setMenuOpen(true)}
          onProfileClick={() => {
            if (proAutoCloseTimerRef.current !== null) {
              window.clearTimeout(proAutoCloseTimerRef.current)

              proAutoCloseTimerRef.current = null
            }

            setSubscriptionModalOpen(true)
          }}
        />

        {/* Content Scroll View (Ergonomic layout for Android 360dp - 412dp) */}
        <div
          className={`content-scroll ${
            isEditingActionDraft ? "editing-draft" : ""
          } ${activeTab === "catalog" ? "catalog-view-scroll" : ""} ${
            isApproved && !showApprovedCard ? "chat-expanded-scroll" : ""
          }`}
          ref={contentScrollRef}
        >
          {activeTab === "home" && (
            <HomeScreen
              userName={userName}
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              onApproved={handleApproved}
              onOpenInbox={() => setActiveTab("inbox")}
              onOpenCatalog={() => setActiveTab("catalog")}
              onOpenSettings={() => setActiveTab("settings")}
              chatMessages={chatMessages}
              isAiThinking={isAiThinking}
              isChattingOrTyping={isChattingOrTyping}
              voiceState={voiceState}
              chatCardRef={chatCardRef}
              chatScrollRef={chatScrollRef}
              isApproved={isApproved}
              showApprovedCard={showApprovedCard}
              onEditingChange={setIsEditingActionDraft}
              pendingAction={
                realPendingActions[0]
                  ? {
                      id: realPendingActions[0].id,

                      customerName:
                        realPendingActions[0].customer_name || "Customer",

                      customerMessage:
                        realPendingActions[0].customer_message || "New inquiry",

                      draftReply: realPendingActions[0].draft_reply || "",
                    }
                  : null
              }
            />
          )}
          {activeTab === "inbox" && selectedThread && (
            <ConversationThread
              convoName={selectedThread.name}
              convoInitials={selectedThread.initials}
              messages={threadMsgs[selectedThread.id] || []}
              replyText={manualReplyText}
              sending={manualSending}
              customerTyping={customerTypingId === selectedThread.id}
              onReplyChange={setManualReplyText}
              onSend={handleSendManualReply}
              onBack={handleCloseThread}
            />
          )}
          {activeTab === "inbox" && !selectedThread && (
            <InboxScreen
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              realConvos={realInboxConvos}
              previews={threadPreviews}
              readIds={threadReadIds}
              onOpenConversation={handleOpenThread}
            />
          )}
          {activeTab === "catalog" && (
            <CatalogScreen
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              products={products}
              onOpenEditProduct={handleOpenEditProduct}
              onOpenCreateProduct={handleOpenCreateProduct}
            />
          )}
          {activeTab === "settings" && (
            <SettingsView
              onBack={() => setActiveTab("home")}
              userName={userName}
              onUserNameChange={setUserName}
            />
          )}
        </div>

        {/* Gemini-Style Floating Bottom Input Capsule Dock (Size x 2 with Multi-Line Text Input & Send) */}
        {activeTab !== "settings" &&
          activeTab !== "catalog" &&
          !isEditingActionDraft &&
          !selectedThreadId && (
            <div className="input-capsule-container">
              <div className="input-capsule size-x2">
                {activeTab === "inbox" && allConvos.length > 0 && (
                  <div
                    className="capsule-recipient-row"
                    role="group"
                    aria-label="Choose customer for send commands"
                  >
                    <span className="capsule-recipient-label">To:</span>
                    {allConvos.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`capsule-recipient-chip ${
                          (capsuleTargetId || resolveCapsuleTargetId(null)) ===
                          c.id
                            ? "active"
                            : ""
                        }`}
                        onClick={() => setCapsuleTargetId(c.id)}
                      >
                        {c.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                )}
                {/* Top Row: Merchant can write a message to talk to AI */}
                <div className="capsule-text-container">
                  <textarea
                    className="capsule-text-input"
                    placeholder={
                      activeTab === "inbox"
                        ? 'Write to customer… try "Send thanks to Maria"'
                        : "Ask Mume or write a message…"
                    }
                    value={chatInput}
                    onChange={(e) => handleTyping(e.target.value)}
                    onFocus={() => {
                      setIsInputFocused(true)

                      adjustConversationPosition(true)
                    }}
                    onBlur={() => {
                      setIsInputFocused(false)

                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                      }

                      setIsTyping(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()

                        handleCapsuleSend()
                      }
                    }}
                    rows={2}
                  />
                </div>

                {/* Bottom Row: Quick Tools, Status & Controls */}
                <div className="capsule-controls-row">
                  <button
                    type="button"
                    className="capsule-plus-button"
                    onClick={() => setActiveTab("catalog")}
                    aria-label="Upload and quick actions"
                  >
                    +
                  </button>

                  <div className="capsule-status-area">
                    {voiceState === "listening" && (
                      <div className="capsule-voice-row">
                        <VoiceWave />
                        <span className="capsule-status">Listening…</span>
                      </div>
                    )}
                    {voiceState === "thinking" && (
                      <div className="capsule-voice-row">
                        <Icon name="bot-svg" size={15} />
                        <span className="capsule-status">
                          Checking your page…
                        </span>
                      </div>
                    )}
                    {voiceState === "idle" && voiceError && (
                      <span className="capsule-error" title={voiceError}>
                        {voiceError}
                      </span>
                    )}
                    {voiceState === "idle" && !voiceError && !chatInput && (
                      <span className="capsule-hint">
                        {activeTab === "inbox"
                          ? "Tap mic or write Send … to deliver"
                          : "Tap mic or write to AI"}
                      </span>
                    )}
                    {voiceState === "idle" &&
                      !voiceError &&
                      capsuleSendTargetName && (
                        <span className="capsule-will-send">
                          Will send to {capsuleSendTargetName} · live
                        </span>
                      )}
                  </div>

                  <div className="capsule-actions-right">
                    <button
                      type="button"
                      className={`capsule-mic-button-small ${
                        voiceState === "listening" ? "active" : ""
                      }`}
                      onClick={handleVoice}
                      aria-label="Dictate and talk to Mume"
                    >
                      {voiceState === "thinking" ? (
                        <Icon name="bot-svg" size={17} />
                      ) : voiceState === "listening" ? (
                        <Icon name="audio-waveform" size={17} />
                      ) : (
                        <span>🎙️</span>
                      )}
                    </button>

                    <button
                      type="button"
                      className={`capsule-send-button ${
                        chatInput.trim() ? "active" : ""
                      }`}
                      onClick={() => handleCapsuleSend()}
                      disabled={!chatInput.trim() || isAiThinking}
                      aria-label="Send message"
                    >
                      <Icon name="send" size={15} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="capsule-disclaimer">
                {activeTab === "inbox"
                  ? '"Send / deliver …" delivers to the customer live. Anything else asks AI.'
                  : "Nothing is sent without your approval."}
              </p>
            </div>
          )}

        {/* Floating Add Product Button at Bottom for Catalog */}
        {activeTab === "catalog" && isLoggedIn && (
          <button
            type="button"
            className="add-product-fab"
            aria-label="Add"
            onClick={handleOpenCreateProduct}
          >
            <Icon name="round-plus" size={24} />
          </button>
        )}

        {/* Slide-out Menu Drawer containing all navigation options */}
        {menuOpen && (
          <div
            className="drawer-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
          >
            <div
              className="drawer-backdrop"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="drawer-panel">
              {/* Drawer Header */}
              <div className="drawer-header">
                <div className="drawer-brand">
                  <Icon name="mume-black" size={24} />
                </div>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              {/* Store details */}
              <div className="drawer-store-card">
                <strong>
                  {isLoggedIn ? "Mume Fresh - Fruit Store" : "No Store Linked"}
                </strong>
                <span>
                  {isLoggedIn
                    ? "Messenger AI Assistant · Meta Synced"
                    : "Log in with Facebook to sync store"}
                </span>
              </div>

              {/* Options Navigation */}
              <div className="drawer-nav">
                <span className="drawer-section-heading">NAVIGATION</span>

                <button
                  type="button"
                  className={`drawer-nav-item ${
                    activeTab === "home" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("home")

                    setMenuOpen(false)
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="home" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Home</strong>
                    <span>Overview & action items</span>
                  </div>
                  {activeTab === "home" && <i className="drawer-active-bar" />}
                </button>

                <button
                  type="button"
                  className={`drawer-nav-item ${
                    activeTab === "inbox" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("inbox")

                    setMenuOpen(false)
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="bookmark" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Message</strong>
                    <span>Customer inquiries</span>
                  </div>
                  <span className="drawer-badge">{isLoggedIn ? 2 : 0}</span>
                </button>

                <button
                  type="button"
                  className={`drawer-nav-item ${
                    activeTab === "catalog" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("catalog")

                    setMenuOpen(false)
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="folder" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Catalog</strong>
                    <span>Products & prices</span>
                  </div>
                  <span className="drawer-badge-secondary">
                    {isLoggedIn ? products.length : 0}
                  </span>
                </button>

                <button
                  type="button"
                  className={`drawer-nav-item ${
                    activeTab === "settings" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab("settings")

                    setMenuOpen(false)
                  }}
                >
                  <span className="drawer-icon-wrap">
                    <Icon name="wrench" size={18} />
                  </span>
                  <div className="drawer-nav-copy">
                    <strong>Settings</strong>
                    <span>Meta token & configuration</span>
                  </div>
                  {activeTab === "settings" && (
                    <i className="drawer-active-bar" />
                  )}
                </button>
              </div>

              <div className="flex-1" />

              {/* User Profile Footer or Login */}
              {isLoggedIn ? (
                <div className="drawer-user-footer">
                  <button
                    type="button"
                    className="drawer-user-info"
                    onClick={() => {
                      setActiveTab("settings")

                      setMenuOpen(false)
                    }}
                  >
                    <span className="avatar drawer-avatar">{userInitials}</span>
                    <div className="drawer-user-copy">
                      <strong>{userName}</strong>
                      <span>Store Owner · Admin</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="drawer-logout-btn"
                    onClick={() => setLogoutConfirmOpen(true)}
                    aria-label="Log out"
                    title="Log out"
                  >
                    <Icon name="log-out" size={18} />
                  </button>
                </div>
              ) : (
                <div className="drawer-user-footer">
                  <button
                    type="button"
                    className="drawer-login-btn"
                    onClick={handleLogin}
                  >
                    <Icon name="baseline-facebook" size={18} />
                    <span>Login using Facebook</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout Confirmation Dialog Modal */}
        {logoutConfirmOpen && (
          <div
            className="confirm-modal-overlay"
            onClick={() => setLogoutConfirmOpen(false)}
          >
            <div
              className="confirm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-modal-icon-circle">
                <Icon name="log-out" size={24} />
              </div>
              <h3>Log Out of Mume?</h3>
              <p>
                Are you sure you want to log out? You will need to reconnect to
                manage your store inquiries.
              </p>
              <div className="confirm-modal-actions-row">
                <button
                  type="button"
                  className="confirm-modal-cancel-btn"
                  onClick={() => setLogoutConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-modal-logout-btn"
                  onClick={() => {
                    setLogoutConfirmOpen(false)

                    handleLogout()
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {selectedProduct && (
          <div
            className="product-modal-overlay"
            onClick={() => setSelectedProduct(null)}
          >
            <div
              className="product-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="product-modal-header">
                <div>
                  <h3>Edit Product</h3>
                  <p>Update fruit details or delete item</p>
                </div>
                <button
                  type="button"
                  className="product-modal-close-btn"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="product-modal-body">
                <label className="product-field-label">Product Photo</label>
                <button
                  type="button"
                  className={`upload-photo-btn ${
                    productForm.imageUri || productForm.imageKey ? "active" : ""
                  }`}
                  onClick={handlePickCustomImage}
                >
                  {productForm.imageUri ||
                  (productForm.imageKey &&
                    FRUIT_IMAGE_MAP[
                      (productForm.imageKey as "apple" | "mango" | "banana")
                    ]) ? (
                    <div className="upload-photo-preview-row">
                      <img
                        src={
                          productForm.imageUri ||
                          FRUIT_IMAGE_MAP[
                            (productForm.imageKey as "apple" | "mango" | "banana")
                          ]
                        }
                        alt="Product preview"
                        className="upload-photo-preview-thumb"
                      />
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">
                          {productForm.imageUri
                            ? "Custom Photo Added"
                            : "Product Photo"}
                        </strong>
                        <span className="text-[11px] text-gray-500">
                          Click to change photo
                        </span>
                      </div>
                      <span className="upload-photo-badge">
                        <Icon name="camera" size={13} />
                        Change
                      </span>
                    </div>
                  ) : (
                    <div className="upload-photo-placeholder-row">
                      <div className="upload-photo-icon-circle">
                        <Icon name="camera" size={18} />
                      </div>
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">
                          Upload from Device / Camera
                        </strong>
                        <span className="text-[11px] text-gray-500">
                          Select any image or take a photo
                        </span>
                      </div>
                    </div>
                  )}
                </button>

                <label className="product-field-label">Product Name</label>
                <input
                  type="text"
                  className="product-modal-input"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. Red apples"
                />

                <label className="product-field-label">Price</label>
                <input
                  type="text"
                  className="product-modal-input"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  placeholder="e.g. $2.50 / kg"
                />

                <label className="product-field-label">Stock Status</label>
                <div className="stock-status-row">
                  {(["In stock", "Low stock", "Out of stock"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        className={`stock-status-btn ${
                          productForm.stock === st ? "active" : ""
                        }`}
                        onClick={() =>
                          setProductForm((prev) => ({ ...prev, stock: st }))
                        }
                      >
                        {st}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="product-modal-actions">
                <button
                  type="button"
                  className="product-delete-btn"
                  onClick={handleDeleteProduct}
                >
                  <Icon name="trash" size={16} />
                  <span>Delete</span>
                </button>

                <div className="product-modal-right-btns">
                  <button
                    type="button"
                    className="product-cancel-btn"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="product-save-btn"
                    onClick={handleSaveProductEdit}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Product Modal */}
        {isCreateModalOpen && (
          <div
            className="product-modal-overlay"
            onClick={() => setIsCreateModalOpen(false)}
          >
            <div
              className="product-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="product-modal-header">
                <div>
                  <h3>Add New Product</h3>
                  <p>Create a new item in your catalog</p>
                </div>
                <button
                  type="button"
                  className="product-modal-close-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                  aria-label="Close"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="product-modal-body">
                <label className="product-field-label">Product Photo</label>
                <button
                  type="button"
                  className={`upload-photo-btn ${
                    productForm.imageUri ? "active" : ""
                  }`}
                  onClick={handlePickCustomImage}
                >
                  {productForm.imageUri ? (
                    <div className="upload-photo-preview-row">
                      <img
                        src={productForm.imageUri}
                        alt="Product preview"
                        className="upload-photo-preview-thumb"
                      />
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">
                          Custom Photo Added
                        </strong>
                        <span className="text-[11px] text-gray-500">
                          Click to change photo
                        </span>
                      </div>
                      <span className="upload-photo-badge">
                        <Icon name="camera" size={13} />
                        Change
                      </span>
                    </div>
                  ) : (
                    <div className="upload-photo-placeholder-row">
                      <div className="upload-photo-icon-circle">
                        <Icon name="camera" size={18} />
                      </div>
                      <div className="text-left flex-1">
                        <strong className="text-xs text-gray-900 block">
                          Upload from Device / Camera
                        </strong>
                        <span className="text-[11px] text-gray-500">
                          Select any image or take a photo
                        </span>
                      </div>
                    </div>
                  )}
                </button>

                <label className="product-field-label">Product Name</label>
                <input
                  type="text"
                  autoFocus
                  className="product-modal-input"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. Fuji Apple"
                />

                <label className="product-field-label">Price</label>
                <input
                  type="text"
                  className="product-modal-input"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  placeholder="e.g. $3.00 / kg"
                />

                <label className="product-field-label">Stock Status</label>
                <div className="stock-status-row">
                  {(["In stock", "Low stock", "Out of stock"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        className={`stock-status-btn ${
                          productForm.stock === st ? "active" : ""
                        }`}
                        onClick={() =>
                          setProductForm((prev) => ({ ...prev, stock: st }))
                        }
                      >
                        {st}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="product-modal-actions">
                <div className="flex-1" />
                <div className="product-modal-right-btns">
                  <button
                    type="button"
                    className="product-cancel-btn"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="product-save-btn"
                    disabled={!productForm.name.trim()}
                    style={
                      !productForm.name.trim()
                        ? { opacity: 0.5, cursor: "not-allowed" }
                        : {}
                    }
                    onClick={handleSaveCreateProduct}
                  >
                    Add Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Upgrade to Pro Modal */}
        {subscriptionModalOpen && (
          <div
            className="product-modal-overlay"
            onClick={closeSubscriptionModal}
          >
            <div
              className="pro-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with badge and close button */}
              <div className="pro-modal-header">
                <div className="pro-plan-badge">
                  <Icon
                    name="subscription-upgrade"
                    size={14}
                    className="text-white"
                  />
                  <span>MUME PRO</span>
                </div>
                <button
                  type="button"
                  className="pro-modal-close-btn"
                  onClick={closeSubscriptionModal}
                  aria-label="Close"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              <h2 className="pro-modal-title">Upgrade to Pro</h2>
              <p className="pro-modal-subtitle">
                Unlock unlimited capabilities to scale your store catalog and
                chat with AI effortlessly.
              </p>

              {/* Price card */}
              <div className="pro-price-box">
                <div className="pro-price-header">
                  <span className="pro-price-tier">Pro Store Membership</span>
                  <span className="pro-price-tag">Most Popular</span>
                </div>
                <div className="pro-price-amount-row">
                  <span className="pro-price-currency">$</span>
                  <span className="pro-price-number">9.99</span>
                  <span className="pro-price-period">/ month</span>
                </div>
                <p className="pro-price-guarantee">
                  7-day free trial · Cancel anytime with 1-click
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="pro-features-list">
                <div className="pro-feature-item">
                  <div className="pro-feature-icon-circle">
                    <Icon name="folder" size={18} />
                  </div>
                  <div className="pro-feature-text-col">
                    <h4>Additional Product Space for Catalog</h4>
                    <p>
                      Unlimited inventory items, custom photos, and high-res
                      variants without restrictions.
                    </p>
                  </div>
                </div>

                <div className="pro-feature-item">
                  <div className="pro-feature-icon-circle">
                    <Icon name="audio-waveform" size={18} />
                  </div>
                  <div className="pro-feature-text-col">
                    <h4>Unlimited Voice Chat</h4>
                    <p>
                      Dictate commands, inquire about stock, and draft replies
                      with zero audio limits.
                    </p>
                  </div>
                </div>

                <div className="pro-feature-item">
                  <div className="pro-feature-icon-circle">
                    <Icon name="bot-svg" size={18} />
                  </div>
                  <div className="pro-feature-text-col">
                    <h4>24/7 Meta Messenger Auto-Sync</h4>
                    <p>
                      Instant price inquiry detection and automated smart reply
                      generation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pro-modal-actions">
                <button
                  type="button"
                  aria-label={isProUser ? "Pro Plan" : "Start 7-Day Free Trial"}
                  className={`pro-upgrade-btn ${isProUser ? "active" : ""}`}
                  onClick={() => {
                    if (proAutoCloseTimerRef.current !== null) {
                      window.clearTimeout(proAutoCloseTimerRef.current)

                      proAutoCloseTimerRef.current = null
                    }

                    setIsProUser(true)

                    setSubscriptionModalOpen(false)

                    setProToast(true)

                    window.setTimeout(() => setProToast(false), 3500)
                  }}
                >
                  <Icon
                    name={isProUser ? "check" : "subscription-upgrade"}
                    size={18}
                  />
                  <span>
                    {isProUser ? "Pro Plan" : "Start 7-Day Free Trial"}
                  </span>
                </button>

                <button
                  type="button"
                  className="pro-dismiss-btn"
                  onClick={closeSubscriptionModal}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Confirmation Toast */}
        {sent && (
          <div className="toast" role="status">
            <span>
              <Icon name="check" size={18} />
            </span>
            <span>{sentLabel}</span>
          </div>
        )}

        {/* Pro Subscription Toast */}
        {proToast && (
          <div className="toast" role="status">
            <span>
              <Icon
                name="subscription-upgrade"
                size={18}
                className="text-yellow-400"
              />
            </span>
            <span>Welcome to Mume Pro! Unlimited features unlocked.</span>
          </div>
        )}
      </main>
    </div>
  )
}
