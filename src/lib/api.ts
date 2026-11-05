const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Sent as `x-api-key` when the backend has API_KEY configured. The key is
// optional in local development and required once the server enforces it.
const API_KEY = import.meta.env.VITE_API_KEY || '';

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return API_KEY ? { 'x-api-key': API_KEY, ...extra } : { ...extra };
}

export interface LinkedPage {
  id: string;
  fb_page_id: string;
  page_name: string;
  created_at: string;
  updated_at: string;
}

export const api = {
  async getFacebookLoginUrl(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/auth/facebook/url`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve Facebook Login URL');
    const data = await res.json();
    return data.url;
  },

  async getLinkedPages(): Promise<LinkedPage[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages`, {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.pages || [];
    } catch {
      return [];
    }
  },

  async getChatMessages(pageId?: string): Promise<{ conversationId: string; messages: any[] }> {
    const query = pageId ? `?pageId=${encodeURIComponent(pageId)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/chat/messages${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch chat messages');
    return res.json();
  },

  async sendChatMessage(text: string, pageId?: string): Promise<{ conversationId: string; userMessage: any; aiMessage: any }> {
    const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, pageId }),
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  async getPageConversations(pageId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/conversations`, {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch {
      return [];
    }
  },

  async getPageInbox(pageId: string, limit = 10): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/inbox?limit=${limit}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return { conversations: [] };
      return res.json();
    } catch {
      return { conversations: [] };
    }
  },

  async getPageThreadMessages(pageId: string, threadId: string, limit = 20): Promise<any[]> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/conversations/${encodeURIComponent(threadId)}/messages?limit=${limit}`,
        {
          headers: authHeaders(),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages || [];
    } catch {
      return [];
    }
  },

  async getConversationMessages(conversationId: string): Promise<any[]> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          headers: authHeaders(),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages || [];
    } catch {
      return [];
    }
  },

  async replyToCustomer(
    pageId: string,
    payload: { psid: string; text: string; lastCustomerMessageAt: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/pages/${encodeURIComponent(pageId)}/messages/reply`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...payload, approvalStatus: 'approved' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send reply');
    }
    return res.json();
  },

  async getPendingActions(pageId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages/${pageId}/pending-actions`, {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.pendingActions || [];
    } catch {
      return [];
    }
  },

  async approvePendingAction(actionId: string, editedReply?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/pending-actions/${actionId}/approve`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ editedReply }),
    });
    if (!res.ok) throw new Error('Failed to approve pending action');
    return res.json();
  },

  // System auto-delete trigger: removes real API rows older than 10 minutes.
  // Dummy content is frontend-only and never affected.
  async pruneExpiredRealData(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/maintenance/prune-expired`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },
};
