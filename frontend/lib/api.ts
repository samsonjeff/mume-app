// No production URL is hardcoded here: forks deploy to their own backend,

// so the default is local development. Set EXPO_PUBLIC_API_URL per environment.
import { postTranscribe } from "./transcribeClient"

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/+$/, "")

// Sent as `x-api-key` when the backend has API_KEY configured. The key is

// optional in local development and required once the server enforces it.

const API_KEY = process.env.EXPO_PUBLIC_API_KEY || ""

function authHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return API_KEY ? { "x-api-key": API_KEY, ...extra } : { ...extra }
}

export interface LinkedPage {
  id: string

  fb_page_id: string

  page_name: string

  created_at: string

  updated_at: string
}

export const api = {
  async getFacebookLoginUrl(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/auth/facebook/url`, {
      headers: authHeaders(),
    })

    if (!res.ok) throw new Error("Failed to retrieve Facebook Login URL")

    const data = await res.json()

    return data.url
  },

  async getLinkedPages(): Promise<LinkedPage[]> {
    const res = await fetch(`${API_BASE_URL}/api/pages`, {
      headers: authHeaders(),
    })

    if (!res.ok) throw new Error("Failed to fetch linked pages")

    const data = await res.json()

    return data.pages || []
  },

  async linkDirectPage(payload: {
    fbPageId: string
    pageName: string
    pageAccessToken: string
  }): Promise<LinkedPage> {
    const res = await fetch(`${API_BASE_URL}/api/pages/link-direct`, {
      method: "POST",

      headers: authHeaders({ "Content-Type": "application/json" }),

      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))

      throw new Error(err.error || "Failed to link page directly")
    }

    const data = await res.json()

    return data.page
  },

  async getPageInbox(pageId: string, limit = 10): Promise<any> {
    const res = await fetch(
      `${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/inbox?limit=${limit}`,
      {
        headers: authHeaders(),
      },
    )

    if (!res.ok) throw new Error("Failed to fetch page inbox")

    return res.json()
  },

  async getPageThreadMessages(
    pageId: string,
    threadId: string,
    limit = 20,
  ): Promise<any[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/conversations/${encodeURIComponent(threadId)}/messages?limit=${limit}`,

      {
        headers: authHeaders(),
      },
    )

    if (!res.ok) throw new Error("Failed to fetch Graph thread messages")

    const data = await res.json()

    return data.messages || []
  },

  async getChatMessages(pageId?: string): Promise<{
    conversationId: string
    messages: any[]
  }> {
    const query = pageId ? `?pageId=${encodeURIComponent(pageId)}` : ""

    const res = await fetch(`${API_BASE_URL}/api/chat/messages${query}`, {
      headers: authHeaders(),
    })

    if (!res.ok) throw new Error("Failed to fetch chat messages")

    return res.json()
  },

  // Merchant voice input, bounded: the hosted backend can take 15s+ to wake

  // from sleep, so the request times out (60s) with one retry instead of hanging.

  async transcribeVoice(payload: {
    audio: string

    mimeType?: string

    language?: string
  }): Promise<{ text: string }> {
    return postTranscribe({
      url: `${API_BASE_URL}/api/voice/transcribe`,

      apiKey: API_KEY,

      payload,
    })
  },

  async sendChatMessage(text: string, pageId?: string): Promise<{
    conversationId: string
    userMessage: any
    aiMessage: any
    sentTo?: Array<{ conversationId: string, customerName: string }>
  }> {
    const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
      method: "POST",

      headers: authHeaders({ "Content-Type": "application/json" }),

      body: JSON.stringify({ text, pageId }),
    })

    if (!res.ok) throw new Error("Failed to send chat message")

    return res.json()
  },

  async getPageConversations(pageId: string): Promise<any[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/conversations`,
      {
        headers: authHeaders(),
      },
    )

    if (!res.ok) throw new Error("Failed to fetch conversations")

    const data = await res.json()

    return data.conversations || []
  },

  async getConversationMessages(conversationId: string): Promise<any[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,

      {
        headers: authHeaders(),
      },
    )

    if (!res.ok) throw new Error("Failed to fetch conversation messages")

    const data = await res.json()

    return data.messages || []
  },

  async getPendingActions(pageId: string): Promise<any[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/pages/${pageId}/pending-actions`,
      {
        headers: authHeaders(),
      },
    )

    if (!res.ok) throw new Error("Failed to fetch pending actions")

    const data = await res.json()

    return data.pendingActions || []
  },

  async approvePendingAction(
    actionId: string,
    editedReply?: string,
  ): Promise<any> {
    const res = await fetch(
      `${API_BASE_URL}/api/pending-actions/${actionId}/approve`,
      {
        method: "POST",

        headers: authHeaders({ "Content-Type": "application/json" }),

        body: JSON.stringify({ editedReply }),
      },
    )

    if (!res.ok) throw new Error("Failed to approve pending action")

    return res.json()
  },

  // Manual merchant reply to a customer. The merchant typing Send IS the

  // human approval, so approvalStatus is always passed explicitly as 'approved'.

  async replyToCustomer(
    pageId: string,

    payload: { psid: string, text: string, lastCustomerMessageAt: string },
  ): Promise<any> {
    const res = await fetch(
      `${API_BASE_URL}/api/pages/${pageId}/messages/reply`,
      {
        method: "POST",

        headers: authHeaders({ "Content-Type": "application/json" }),

        body: JSON.stringify({ ...payload, approvalStatus: "approved" }),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))

      throw new Error(err.error || "Failed to send reply")
    }

    return res.json()
  },
}
