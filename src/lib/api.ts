const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface LinkedPage {
  id: string;
  fb_page_id: string;
  page_name: string;
  created_at: string;
  updated_at: string;
}

export const api = {
  async getFacebookLoginUrl(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/auth/facebook/url`);
    if (!res.ok) throw new Error('Failed to retrieve Facebook Login URL');
    const data = await res.json();
    return data.url;
  },

  async getLinkedPages(): Promise<LinkedPage[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.pages || [];
    } catch {
      return [];
    }
  },

  async getChatMessages(pageId?: string): Promise<{ conversationId: string; messages: any[] }> {
    const query = pageId ? `?pageId=${encodeURIComponent(pageId)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/chat/messages${query}`);
    if (!res.ok) throw new Error('Failed to fetch chat messages');
    return res.json();
  },

  async sendChatMessage(text: string, pageId?: string): Promise<{ conversationId: string; userMessage: any; aiMessage: any }> {
    const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, pageId }),
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  async getPageConversations(pageId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages/${pageId}/conversations`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch {
      return [];
    }
  },

  async getPendingActions(pageId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages/${pageId}/pending-actions`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedReply }),
    });
    if (!res.ok) throw new Error('Failed to approve pending action');
    return res.json();
  },
};
