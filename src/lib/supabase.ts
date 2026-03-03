import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This is the client used by the frontend (Respects RLS)
// detectSessionInUrl ensures tokens from OAuth redirects are automatically captured
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        detectSessionInUrl: true,
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
    },
});

// This is the client used by the backend to bypass RLS for administrative tasks
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
