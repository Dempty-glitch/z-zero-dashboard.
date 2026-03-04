"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Signing you in...");

    useEffect(() => {
        // Set up the auth state listener FIRST, before anything else.
        // This way we catch the SIGNED_IN event no matter when it fires.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    if (session) {
                        setStatus("Success! Redirecting...");
                        // Small delay to ensure session is fully persisted
                        setTimeout(() => {
                            router.replace("/dashboard");
                        }, 500);
                    }
                }
            }
        );

        // Also check if there's already a session (in case the event fired before listener was set)
        const checkExistingSession = async () => {
            // Wait a tick for the supabase client to process URL hash tokens
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus("Success! Redirecting...");
                router.replace("/dashboard");
            } else {
                // Final fallback: check URL for error or just wait
                const hash = window.location.hash;
                const params = new URLSearchParams(hash.substring(1));
                const error = params.get('error_description') || params.get('error');

                if (error) {
                    setStatus(`Error: ${error}`);
                    setTimeout(() => router.replace("/login"), 3000);
                }
            }
        };

        checkExistingSession();

        // Ultimate timeout fallback
        const timeout = setTimeout(() => {
            setStatus("Taking too long... Redirecting to login.");
            router.replace("/login");
        }, 8000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [router]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-zinc-400 text-sm">{status}</p>
        </div>
    );
}
