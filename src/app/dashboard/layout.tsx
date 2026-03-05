'use client';

import { Terminal, CreditCard, LayoutDashboard, User, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [userLabel, setUserLabel] = useState('Loading...');
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                // Show email or Google display name, truncated
                const label = user.user_metadata?.full_name ||
                    user.email?.split('@')[0] ||
                    'User';
                setUserLabel(label);

                // Check admin status
                supabase.from('users')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => {
                        if (data?.is_admin) setIsAdmin(true);
                    });
            }
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-6 hidden md:flex flex-col">
                <div className="flex items-center gap-2 mb-10 text-emerald-400 font-bold text-xl">
                    <Terminal className="h-6 w-6" /> Z-ZERO
                </div>

                <nav className="space-y-2 flex-1">
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/dashboard/agents"><Terminal className="mr-2 h-4 w-4" /> AI Agents (Keys)</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/dashboard/transactions"><CreditCard className="mr-2 h-4 w-4" /> Transactions</Link>
                    </Button>

                    {isAdmin && (
                        <div className="pt-4 mt-4 border-t border-zinc-900/50">
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-4 mb-2">Internal Controls</p>
                            <Button variant="ghost" className="w-full justify-start text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/5 border border-transparent hover:border-amber-500/20" asChild>
                                <Link href="/admin"><ShieldAlert className="mr-2 h-4 w-4" /> Admin Panel</Link>
                            </Button>
                        </div>
                    )}
                </nav>

                <div className="mt-auto border-t border-zinc-800 pt-6 space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2 text-zinc-400 text-sm truncate">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{userLabel}</span>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-500 hover:text-white hover:bg-zinc-800"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" /> Log out
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
                {/* Mobile Header */}
                <div className="md:hidden border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950/50">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Terminal className="h-5 w-5" /> Z-ZERO
                    </div>
                    <Button variant="outline" size="sm" className="border-zinc-700 bg-black text-xs" onClick={handleLogout}>
                        <LogOut className="h-3 w-3 mr-1" /> Log out
                    </Button>
                </div>

                <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
