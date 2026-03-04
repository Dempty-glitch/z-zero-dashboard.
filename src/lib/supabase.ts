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
// It MUST use the SERVICE_ROLE_KEY (which should NEVER be prefixed with NEXT_PUBLIC_)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
