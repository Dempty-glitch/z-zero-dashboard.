"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Wallet, Chrome, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error("Login error:", error);
            alert("Failed to initiate login: " + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <Link href="/" className="absolute top-8 left-8 text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
                &larr; Back to Home
            </Link>

            <Card className="w-full max-w-md bg-zinc-900/40 border-zinc-800 backdrop-blur-xl shadow-2xl relative z-10">
                <CardHeader className="text-center space-y-4 pt-10">
                    <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Wallet className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-bold tracking-tight">Human Login</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Authorize your agents and pre-fund your crypto account.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 mt-4 pb-12">
                    <div className="space-y-3">
                        {/* Google Login Button */}
                        <Button
                            className="w-full h-14 text-md font-bold bg-white text-black hover:bg-zinc-200 transition-all border-none shadow-xl shadow-white/5"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    <Chrome className="mr-2 h-5 w-5" />
                                    Continue with Google
                                </>
                            )}
                        </Button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                                <span className="bg-zinc-900/40 px-3 text-zinc-500">Other Methods</span>
                            </div>
                        </div>

                        {/* Wallet Placeholder (Future) */}
                        <Button
                            variant="outline"
                            className="w-full h-13 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white text-zinc-400 transition-all group"
                            disabled={loading}
                        >
                            <Wallet className="mr-2 h-5 w-5 group-hover:text-blue-400 transition-colors" />
                            Connect Web3 Wallet
                        </Button>
                    </div>

                    <p className="text-[10px] text-center text-zinc-500 leading-relaxed px-6">
                        By signing in, you agree to the <span className="text-zinc-300 underline cursor-pointer">Z-ZERO Terms</span> and <span className="text-zinc-300 underline cursor-pointer">Privacy Policy</span>.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
