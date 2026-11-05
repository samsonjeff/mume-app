const { createApp, getRealDataTtlMs, getRealDataCutoffIso } = require('./app');
const { getSupabaseClient } = require('./services/supabase');

const port = Number(process.env.PORT) || 3000;

const app = createApp();
app.listen(port, () => {
  console.log(`mume-backend listening on port ${port}`);
});

// System auto-delete sweeper: every 60s removes real API rows older than
// the 10-minute TTL (messages, pending_actions, conversation_sessions,
// conversations). Dummy content lives only in the frontend and is never
// stored, so it is never affected. Persistent tables (pages, users,
// products) are intentionally never pruned.
const ttlMs = getRealDataTtlMs(process.env);
const SWEEP_INTERVAL_MS = 60 * 1000;

async function sweepExpiredRealData() {
  const supabase = getSupabaseClient(process.env);
  if (!supabase) return;
  const cutoff = getRealDataCutoffIso(Date.now(), ttlMs);
  try {
    await supabase.from('messages').delete().lt('created_at', cutoff);
    await supabase.from('pending_actions').delete().lt('created_at', cutoff);
    await supabase.from('conversation_sessions').delete().lt('last_activity_at', cutoff);
    await supabase.from('conversations').delete().lt('last_message_at', cutoff);
  } catch (err) {
    console.warn('[ttl-sweep] Warning:', err.message);
  }
}

setInterval(sweepExpiredRealData, SWEEP_INTERVAL_MS).unref?.();
setTimeout(sweepExpiredRealData, 5000).unref?.();
