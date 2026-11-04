/**
 * Mume AI Assistant reply generator.
 * Inventory-aware, Tagalog- and English-friendly responses for store merchants.
 *
 * Context-aware: pass recent thread history + the persisted session summary so
 * follow-up questions ("how much?", "meron pa?") inherit the product topic
 * instead of falling through to the generic default. Legacy single-argument
 * calls keep byte-identical replies.
 */

const TOPICS = {
  apple: {
    keys: ['apple', 'mansanas'],
    label: 'red apples',
    priceLine:
      'Red apples are currently $2.50 / kg (In stock). Maria A. asked about them earlier today on Messenger.',
  },
  mango: {
    keys: ['mango', 'manga', 'mangga'],
    label: 'mango',
    priceLine: 'Carabao mangoes are $4.00 / kg (In stock). Jun L. inquired about their availability.',
  },
  banana: {
    keys: ['banana', 'saging'],
    label: 'banana',
    priceLine: 'Lakatan bananas are $1.80 / kg (Low stock - only a few bunches left).',
  },
};

function detectTopic(text) {
  const q = (text || '').toLowerCase();
  for (const key of Object.keys(TOPICS)) {
    if (TOPICS[key].keys.some((k) => q.includes(k))) return key;
  }
  return null;
}

/**
 * Most recent product topic across the query + thread history.
 * Lets short follow-ups ("how much per kilo?", "is there stock?") resolve
 * to the product already being discussed.
 */
function resolveTopic(query, history) {
  const direct = detectTopic(query);
  if (direct) return direct;
  for (let i = (history || []).length - 1; i >= 0; i--) {
    const t = detectTopic(history[i] && history[i].text);
    if (t) return t;
  }
  return null;
}

/**
 * Rolling plain-language session summary persisted to
 * public.conversation_sessions so the next reply — even after a restart —
 * has thread reference without re-reading the whole history.
 */
function buildSessionSummary(history) {
  const rows = Array.isArray(history) ? history : [];
  const topics = [];
  for (const m of rows) {
    const t = detectTopic(m && m.text);
    if (t && !topics.includes(t)) topics.push(TOPICS[t].label);
  }
  let summary = topics.length ? `Discussing: ${topics.join(', ')}.` : 'General inquiry.';
  const lastCustomer = [...rows]
    .reverse()
    .find((m) => m && (m.sender === 'user' || m.sender === 'customer'));
  if (lastCustomer && lastCustomer.text) {
    summary += ` Last customer message: "${String(lastCustomer.text).slice(0, 120)}".`;
  }
  return summary;
}

function getMumeAiReply(query, context) {
  const ctx = context || {};
  const history = Array.isArray(ctx.history) ? ctx.history : [];
  const customerName = ctx.customerName || '';
  const q = (query || '').toLowerCase().trim();

  if (q.includes('apple') || q.includes('mansanas')) {
    return 'Red apples are currently $2.50 / kg (In stock). Maria A. asked about them earlier today on Messenger.';
  }
  if (q.includes('mango') || q.includes('manga') || q.includes('mangga')) {
    return 'Carabao mangoes are $4.00 / kg (In stock). Jun L. inquired about their availability.';
  }
  if (q.includes('banana') || q.includes('saging')) {
    return 'Lakatan bananas are $1.80 / kg (Low stock - only a few bunches left).';
  }
  if (q.includes('maria') || q.includes('approval') || q.includes('draft') || q.includes('approve')) {
    return 'Maria A. is waiting for a reply on red apples ($2.50 / kg). The suggested draft is ready in your Home tab for approval!';
  }
  if (q.includes('message') || q.includes('inbox') || q.includes('inquir') || q.includes('customer')) {
    return 'You have 2 customer inquiries on Messenger: Maria A. (price inquiry) and Jun L. (stock inquiry). Both are encrypted and synced with Facebook.';
  }
  if (q.includes('price') || q.includes('catalog') || q.includes('inventory') || q.includes('stock')) {
    return 'Your catalog has 3 items: Red apples ($2.50/kg - In stock), Carabao mango ($4.00/kg - In stock), and Lakatan banana ($1.80/kg - Low stock).';
  }
  if (q.includes('magkano') || q.includes('kumusta') || q.includes('meron') || q.includes('salamat') || q.includes('po')) {
    return 'Hello! Your Facebook Page is synced. Suggested reply ready for Maria A. on red apples ($2.50 / kg). Let me know if you want to change anything!';
  }
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('mume')) {
    if (customerName) {
      return `Hello ${customerName}! I'm Mume, your Page AI assistant. Ask me about your customer messages, fruit inventory, or tell me what to draft!`;
    }
    return "Hello Jefferson! I'm Mume, your Page AI assistant. Ask me about your customer messages, fruit inventory, or tell me what to draft!";
  }

  // Context fallback: answer about the product already under discussion.
  const topic = resolveTopic(query, history);
  if (topic) return TOPICS[topic].priceLine;

  return "Got it! I checked your store and Page inquiries. Maria A.'s inquiry for $2.50/kg apples is waiting for approval, and your 3 catalog items are synced. How else can I assist?";
}

module.exports = { getMumeAiReply, buildSessionSummary, resolveTopic, detectTopic };
