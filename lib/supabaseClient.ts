// lib/supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client per il frontend (usa la chiave anonima pubblica)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client per il backend (usa la chiave di servizio per privilegi elevati)
// Viene inizializzato solo se la chiave di servizio è disponibile (cioè, in ambiente server)
let supabaseAdmin: SupabaseClient | null = null;

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const adminDb = supabaseAdmin;
