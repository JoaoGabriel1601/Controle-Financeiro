import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Necessário para o fluxo OAuth (Google) que volta com o token na URL.
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
