"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // The supabase browser client will automatically detect the 
        // auth tokens in the URL hash (#access_token=...) and establish 
        // the session. We just need to wait for it, then redirect.
        const handleAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (session) {
                router.replace("/dashboard");
            } else {
                // If no session yet, listen for auth state change
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        subscription.unsubscribe();
                        router.replace("/dashboard");
                    }
                });

                // Timeout fallback: if nothing happens in 5 seconds, redirect to login
                setTimeout(() => {
                    subscription.unsubscribe();
                    router.replace("/login");
                }, 5000);
            }
        };

        handleAuth();
    }, [router]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-zinc-400">Signing you in...</p>
        </div>
    );
}
