import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

if (!supabaseServiceRoleKey) {
  console.warn(
    'VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations (add member, etc.) will fail. ' +
    'Set this in .env and restart the dev server (or add to Vercel environment variables).'
  );
}

export const supabase = createSupabaseClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Admin client — uses service role key to call auth.admin APIs (invite, create users).
// Only used in privileged admin UI actions, never for regular user sessions.
export const supabaseAdmin = createSupabaseClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || 'placeholder-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);
