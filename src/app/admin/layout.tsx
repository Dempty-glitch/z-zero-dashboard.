'use client';

import {
    ShieldAlert,
    Users,
    LayoutDashboard,
    CreditCard,
    History,
    ExternalLink,
    LogOut,
    Lock,
    Settings,
    TrendingUp
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [isSuperMod, setIsSuperMod] = useState<boolean>(false);
    const [userLabel, setUserLabel] = useState('Admin');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('users')
            .select('is_admin, is_supermod, email, status')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_admin || profile.status !== 'ACTIVE') {
            router.push('/dashboard');
            return;
        }

        setIsAdmin(true);
        setIsSuperMod(!!profile.is_supermod);
        setUserLabel(profile.email.split('@')[0]);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (isAdmin === null) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    const navItems = [
        { href: '/admin', icon: TrendingUp, label: 'Overview' },
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/deposits', icon: CreditCard, label: 'Review Deposits' },
        { href: '/admin/transactions', icon: History, label: 'Global Audit' },
    ];

    if (isSuperMod) {
        navItems.push({ href: '/admin/logs', icon: ShieldAlert, label: 'Admin Actions' });
    }

    navItems.push({ href: '/admin/issuing', icon: Settings, label: 'Partner Config' });

    return (
        <div className="min-h-screen bg-zinc-950 text-foreground flex">
            {/* Admin Sidebar - Red/Gold Theme */}
            <div className="w-64 border-r border-red-900/20 bg-zinc-950 p-6 hidden md:flex flex-col shadow-[10px_0_30px_rgba(255,0,0,0.03)]">
                <div className="flex items-center gap-2 mb-10 text-amber-500 font-bold text-xl uppercase tracking-widest italic">
                    <ShieldAlert className="h-6 w-6 text-red-500" /> Z-CONTROL
                </div>

                <nav className="space-y-1.5 flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Button
                                key={item.href}
                                variant="ghost"
                                className={`w-full justify-start transition-all duration-300 ${isActive
                                    ? "bg-red-500/10 text-amber-500 border-l-2 border-amber-500"
                                    : "text-zinc-500 hover:text-white hover:bg-zinc-900"
                                    }`}
                                asChild
                            >
                                <Link href={item.href}>
                                    <item.icon className={`mr-2 h-4 w-4 ${isActive ? 'text-amber-500' : 'text-zinc-600'}`} />
                                    {item.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>

                <div className="mt-8 mb-6 p-4 rounded-2xl bg-gradient-to-br from-red-950/20 to-transparent border border-red-900/10">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">
                        <Lock size={12} /> Master Session
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                        You are logged in as a SuperMod. Be careful with manual overrides.
                    </p>
                </div>

                <div className="mt-auto border-t border-zinc-900 pt-6 space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white"
                        asChild
                    >
                        <Link href="/dashboard"><ExternalLink className="mr-2 h-4 w-4" /> Back to User View</Link>
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/5"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" /> Terminate Auth
                    </Button>
                </div>
            </div>

            {/* Main Admin Content */}
            <div className="flex-1 flex flex-col min-h-screen bg-[#050505]">
                <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
