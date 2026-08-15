import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const SUPABASE_URL =
  metaEnv.VITE_SUPABASE_URL || 'https://hhohqsuhjxrmvgvtukva.supabase.co';
const SUPABASE_ANON_KEY =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob2hxc3VoanhybXZndnR1a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3Njc3OTMsImV4cCI6MjEwMjM0Mzc5M30.KubnC9IPNJR24tAv-_35pq9MswxsYGOPvhYYuoXB53M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

export const SUPABASE_TABLE = 'lottery_data';
