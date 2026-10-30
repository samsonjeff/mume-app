const { createClient } = require('@supabase/supabase-js');

/**
 * Creates and returns the Supabase Admin client with service_role privileges.
 * This client bypasses RLS for backend orchestration tasks.
 */
function getSupabaseClient(env = process.env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

module.exports = { getSupabaseClient };

