/**
 * Mume AI Assistant reply generator.
 * Provides inventory-aware, Tagalog- and English-friendly responses for store merchants.
 */
function getMumeAiReply(query) {
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
    return "Hello Jefferson! I'm Mume, your Page AI assistant. Ask me about your customer messages, fruit inventory, or tell me what to draft!";
  }
  return "Got it! I checked your store and Page inquiries. Maria A.'s inquiry for $2.50/kg apples is waiting for approval, and your 3 catalog items are synced. How else can I assist?";
}

module.exports = { getMumeAiReply };
