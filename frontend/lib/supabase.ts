import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Credentials come ONLY from the environment. Never commit a real project

// URL or anon key here: committed credentials grant database access to

// everyone who can read the source. When env vars are missing the client

// below points at an unroutable address on purpose, so every query fails

// closed (caught by callers as offline/mock mode) instead of silently

// reaching a real project.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ""

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Warning: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not set in environment. Running in offline/mock mode.",
  )
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || "http://localhost:1",

  supabaseAnonKey || "missing-anon-key",

  {
    auth: {
      persistSession: false,

      autoRefreshToken: false,
    },

    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
)
