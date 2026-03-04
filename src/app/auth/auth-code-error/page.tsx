'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// This page handles the implicit OAuth flow where Supabase sends
// access_token as a URL hash fragment (#access_token=...) instead of
// a code param. The browser reads the hash and sets the session.
export default function AuthCodeErrorPage() {
    const router = useRouter();

    useEffect(() => {
        // The hash fragment (#access_token=...) is only available client-side
        // Supabase client auto-picks up the token from the hash and sets session
        const handleHashAuth = async () => {
            // Small delay to let Supabase client parse the hash
            await new Promise(r => setTimeout(r, 500));

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Session found — redirect to dashboard
                router.push('/dashboard');
            } else {
                // Still no session — show error after a short wait
                await new Promise(r => setTimeout(r, 1500));
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (retrySession) {
                    router.push('/dashboard');
                } else {
                    router.push('/login?error=auth_failed');
                }
            }
        };

        handleHashAuth();
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-black">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-medium">Đang xác thực với Google...</p>
                <p className="text-gray-500 text-sm">Vui lòng đợi một chút</p>
            </div>
        </div>
    );
}
