import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtwwtzcydgfcradsccsv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0d3d0emN5ZGdmY3JhZHNjY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzUzMjQsImV4cCI6MjEwODk1MTMyNH0.V7Tb-yUnL9sR0G69fkufFUoTq4zy0ko38oJB0t33XcY';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
