import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseReady =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("PASTE_") &&
  !supabaseAnonKey.includes("PASTE_");

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;