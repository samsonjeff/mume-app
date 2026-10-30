const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://mume-backend.onrender.com';

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
    const res = await fetch(`${API_BASE_URL}/api/pages`);
    if (!res.ok) throw new Error('Failed to fetch linked pages');
    const data = await res.json();
    return data.pages || [];
  },

  async linkDirectPage(payload: { fbPageId: string; pageName: string; pageAccessToken: string }): Promise<LinkedPage> {
    const res = await fetch(`${API_BASE_URL}/api/pages/link-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to link page directly');
    }
    const data = await res.json();
    return data.page;
  },

  async getPageInbox(pageId: string, limit = 10): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/pages/${pageId}/inbox?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch page inbox');
    return res.json();
  },
};
