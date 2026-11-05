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
    if (Array.isArray(ctx.pendingActions)) return buildPendingStatusReply(ctx.pendingActions);
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

/**
 * True when the merchant message confirms sending waiting customer replies.
 * Covers "yes", "yes send it", "send it", "approve", "go ahead", plus
 * Tagalog assents ("sige", "oo"). Short on purpose: anything longer is
 * a new instruction, not a confirmation.
 */
function isApprovalConfirmation(text) {
  const q = String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return false;
  return /^(yes( please| po)?( send( it| them| now)?)?|send( it| them| now| the repl(ies|y)| all)?|approve(d)?( it| all| them)?|go ahead( send( it)?)?|please send( it)?|(sige|oo|opo)( na| po| send| padala)?|(ok|okay)( send( it)?)?)$/.test(q);
}

/**
 * True when the merchant asks about customer inquiries / pending replies.
 * Confirmation phrases are excluded so "yes, send it" dispatches
 * instead of answering with a status.
 */
function asksAboutInquiries(text) {
  const q = String(text || '').toLowerCase();
  if (!q || isApprovalConfirmation(text)) return false;
  return /(inquir|inbox|pending|waiting|approval|customer|message)/.test(q);
}

/**
 * Live inquiry status reply: names who is waiting and asks whether to send.
 * Pass the waiting_approval actions enriched with customer_name.
 */
function buildPendingStatusReply(actions) {
  const list = (actions || []).filter(Boolean);
  if (list.length === 0) return 'You have no customer inquiries waiting right now.';
  const names = list.map((a) => a.customer_name || 'Customer');
  const who = names.length === 1 ? names[0]
    : names.length === 2 ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  const noun = names.length === 1 ? 'inquiry' : 'inquiries';
  const replyNoun = names.length === 1 ? 'reply is' : 'replies are';
  const pronoun = names.length === 1 ? 'it' : 'them';
  return `You have ${list.length} customer ${noun} waiting: ${who}. The suggested ${replyNoun} ready. Shall I send ${pronoun} now?`;
}

/**
 * Confirmation reply after waiting replies were dispatched.
 * Pass the sent entries ({ customer_name }).
 */
function buildConfirmationSentReply(sent) {
  const names = (sent || []).filter(Boolean).map((e) => (typeof e === 'string' ? e : e.customer_name || 'Customer'));
  if (names.length === 0) return 'Sent!';
  const who = names.length === 1 ? names[0]
    : names.length === 2 ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  return `Sent! I delivered the reply to ${who}.`;
}

module.exports = { getMumeAiReply, buildSessionSummary, resolveTopic, detectTopic, isApprovalConfirmation, asksAboutInquiries, buildPendingStatusReply, buildConfirmationSentReply };
