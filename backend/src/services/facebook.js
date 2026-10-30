const { computeAppSecretProof } = require('./crypto');

const GRAPH_BASE_URL = 'https://graph.facebook.com/v21.0';

/**
 * Returns the Facebook OAuth Dialog URL for linking Facebook Pages.
 */
function getFacebookLoginUrl({ appId, redirectUri, state = 'mume_link' }) {
  const scopes = [
    'pages_show_list',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_read_user_content',
    'pages_messaging',
    'public_profile',
    'email',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchanges authorization code for a User Access Token.
 */
async function exchangeCodeForUserToken({ code, appId, appSecret, redirectUri }) {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${GRAPH_BASE_URL}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to exchange code for user access token');
  }
  return data;
}

/**
 * Retrieves the Facebook Pages managed by the user.
 */
async function getUserPages(userAccessToken, appSecret) {
  const proof = computeAppSecretProof(userAccessToken, appSecret);
  const proofParam = proof ? `&appsecret_proof=${proof}` : '';
  let url = `${GRAPH_BASE_URL}/me/accounts?fields=id,name,category,tasks,access_token${proofParam}`;

  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });
  let data = await res.json();

  if (!res.ok && data.error?.message?.includes('appsecret_proof')) {
    url = `${GRAPH_BASE_URL}/me/accounts?fields=id,name,category,tasks,access_token`;
    res = await fetch(url, { headers: { Authorization: `Bearer ${userAccessToken}` } });
    data = await res.json();
  }

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch user pages');
  }
  return data.data || [];
}

/**
 * Subscribes a Facebook Page to the App's webhooks.
 */
async function subscribePageToApp(pageId, pageAccessToken, appSecret) {
  const proof = computeAppSecretProof(pageAccessToken, appSecret);
  const proofParam = proof ? `&appsecret_proof=${proof}` : '';
  let url = `${GRAPH_BASE_URL}/${encodeURIComponent(pageId)}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed${proofParam}`;

  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pageAccessToken}` },
  });
  let data = await res.json();

  if (!res.ok && data.error?.message?.includes('appsecret_proof')) {
    url = `${GRAPH_BASE_URL}/${encodeURIComponent(pageId)}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed`;
    res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${pageAccessToken}` } });
    data = await res.json();
  }

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to subscribe page to app webhooks');
  }
  return data;
}

/**
 * Fetches Page Conversations (inbox threads).
 */
async function getPageConversations(pageId, pageAccessToken, appSecret, limit = 10) {
  const proof = computeAppSecretProof(pageAccessToken, appSecret);
  const proofParam = proof ? `&appsecret_proof=${proof}` : '';
  let url = `${GRAPH_BASE_URL}/${encodeURIComponent(pageId)}/conversations?fields=id,link,updated_time,unread_count,senders&limit=${limit}${proofParam}`;

  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${pageAccessToken}` },
  });
  let data = await res.json();

  if (!res.ok && data.error?.message?.includes('appsecret_proof')) {
    url = `${GRAPH_BASE_URL}/${encodeURIComponent(pageId)}/conversations?fields=id,link,updated_time,unread_count,senders&limit=${limit}`;
    res = await fetch(url, { headers: { Authorization: `Bearer ${pageAccessToken}` } });
    data = await res.json();
  }

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to read page conversations');
  }
  return data.data || [];
}

/**
 * Fetches messages for a specific conversation thread.
 */
async function getPageMessages(conversationId, pageAccessToken, appSecret, limit = 20) {
  const proof = computeAppSecretProof(pageAccessToken, appSecret);
  const proofParam = proof ? `&appsecret_proof=${proof}` : '';
  let url = `${GRAPH_BASE_URL}/${encodeURIComponent(conversationId)}/messages?fields=id,message,from,created_time&limit=${limit}${proofParam}`;

  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${pageAccessToken}` },
  });
  let data = await res.json();

  if (!res.ok && data.error?.message?.includes('appsecret_proof')) {
    url = `${GRAPH_BASE_URL}/${encodeURIComponent(conversationId)}/messages?fields=id,message,from,created_time&limit=${limit}`;
    res = await fetch(url, { headers: { Authorization: `Bearer ${pageAccessToken}` } });
    data = await res.json();
  }

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to read conversation messages');
  }
  return data.data || [];
}

/**
 * Sends a reply to a customer via Messenger Send API.
 */
async function sendPageReply({ pageId, pageAccessToken, appSecret, psid, text, lastCustomerMessageAt, approvalStatus }) {
  if (approvalStatus !== 'approved') {
    throw new Error('COMPLIANCE_BLOCK: Outbound message requires human approval');
  }
  if (lastCustomerMessageAt) {
    const ageMs = Date.now() - new Date(lastCustomerMessageAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
      throw new Error('COMPLIANCE_BLOCK: Outside 24-hour Standard Messaging Window');
    }
  }

  const proof = computeAppSecretProof(pageAccessToken, appSecret);
  const proofParam = proof ? `?appsecret_proof=${proof}` : '';
  let url = `${GRAPH_BASE_URL}/${encodeURIComponent(pageId)}/messages${proofParam}`;

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: psid },
      message: { text },
    }),
  });

  let data = await res.json();
  if (!res.ok && data.error?.message?.includes('appsecret_proof')) {
    url = `${GRAPH_BASE_URL}/${encodeURIComponent(pageId)}/messages`;
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: { id: psid },
        message: { text },
      }),
    });
    data = await res.json();
  }

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to send Messenger message');
  }
  return data;
}

module.exports = {
  GRAPH_BASE_URL,
  getFacebookLoginUrl,
  exchangeCodeForUserToken,
  getUserPages,
  subscribePageToApp,
  getPageConversations,
  getPageMessages,
  sendPageReply,
};
