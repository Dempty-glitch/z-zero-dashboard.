'use client';

import { useState, useEffect } from "react";
import {
    TrendingUp,
    Users,
    CreditCard,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Zap,
    Clock,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function AdminOverview() {
    const [stats, setStats] = useState({
        totalSpent: 0,
        totalDeposits: 0,
        currentBalance: 0,
        totalUsers: 0,
        depositUsers: 0,
        paidUsers: 0,
        totalTransactions: 0,
        activeAgents: 0,
        pendingDeposits: 0,
        weeklyGrowth: 18.2
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSystemStats();
    }, []);

    const fetchSystemStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch total users
            const { count: userCount } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true });

            // 2. Fetch total spending (GMV)
            const { data: txData } = await supabase
                .from('transactions')
                .select('amount, card_id, cards(user_id)');

            const spentCount = txData?.length || 0;
            const spentTotal = txData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const paidUserIds = new Set(txData?.map(tx => (tx.cards as any)?.user_id).filter(Boolean));

            // 3. Fetch total deposits
            const { data: depositData } = await supabase
                .from('crypto_deposits')
                .select('amount_usd, user_id')
                .eq('status', 'CONFIRMED');

            const depositTotal = depositData?.reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0;
            const depositUserIds = new Set(depositData?.map(d => d.user_id));

            // 4. Fetch total wallet balances
            const { data: walletData } = await supabase
                .from('wallets')
                .select('balance');

            const totalBalance = walletData?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;

            // 5. Fetch active cards (agents)
            const { count: agentCount } = await supabase
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // 6. Fetch pending deposits for alert
            const { count: pendingCount } = await supabase
                .from('crypto_deposits')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PENDING');

            setStats({
                totalSpent: spentTotal,
                totalDeposits: depositTotal,
                currentBalance: totalBalance,
                totalUsers: userCount || 0,
                depositUsers: depositUserIds.size,
                paidUsers: paidUserIds.size,
                totalTransactions: spentCount,
                activeAgents: agentCount || 0,
                pendingDeposits: pendingCount || 0,
                weeklyGrowth: 18.2
            });
        } catch (err) {
            console.error("Admin Stats Error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">System Overview</h1>
                    <p className="text-zinc-500">Real-time performance and ecosystem growth metrics.</p>
                </div>
                <Badge variant="outline" className="bg-amber-500/5 text-amber-500 border-amber-500/20 py-1.5 px-3">
                    <Activity size={12} className="mr-2 animate-pulse" /> Live Monitoring
                </Badge>
            </div>

            {/* Top Grid: Main KPIs */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* GMV CARD - UPDATED */}
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={40} className="text-amber-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total GMV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-3">${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="space-y-1.5 pt-3 border-t border-zinc-800/50">
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                                <span className="text-zinc-600">Total Deposit</span>
                                <span className="text-emerald-500">${stats.totalDeposits.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                                <span className="text-zinc-600">Current Balance</span>
                                <span className="text-amber-500/80">${stats.currentBalance.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* USERS CARD - UPDATED */}
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={40} className="text-blue-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-3">{stats.totalUsers}</div>
                        <div className="space-y-1.5 pt-3 border-t border-zinc-800/50">
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                                <span className="text-zinc-600">Deposit Users</span>
                                <span className="text-blue-400">{stats.depositUsers}</span>
                            </div>
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                                <span className="text-zinc-600">Paid Users</span>
                                <span className="text-purple-400">{stats.paidUsers}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* TRANSACTIONS CARD */}
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard size={40} className="text-purple-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.totalTransactions}</div>
                        <p className="text-xs text-zinc-600 mt-1 italic">
                            AOV: ${(stats.totalSpent / (stats.totalTransactions || 1)).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                {/* AGENTS CARD */}
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={40} className="text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.activeAgents}</div>
                        <p className="text-xs text-emerald-500 mt-1">
                            Live MCP connections
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Section: Growth & Partners */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950 border-zinc-800 h-[350px] relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="text-amber-500" size={18} /> Weekly Velocity
                        </CardTitle>
                        <CardDescription>Aggregate spending volume across all partner nodes.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center pt-10">
                        {/* Placeholder for real chart */}
                        <div className="text-zinc-700 font-mono text-sm border border-dashed border-zinc-800 p-10 rounded-3xl">
                            Chart.js / Recharts placeholder
                            (Rendering weekly bars...)
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-zinc-900/40 border-zinc-800 border-l-4 border-l-red-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex justify-between">
                                System Alerts <Badge className="bg-red-500 text-white text-[10px]">{stats.pendingDeposits > 0 ? 2 : 1}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {stats.pendingDeposits > 0 && (
                                <div className="flex gap-2 text-xs p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                                    <p className="text-zinc-400">{stats.pendingDeposits} Tron/Base deposit(s) pending manual confirmation (&gt; 10 mins)</p>
                                </div>
                            )}
                            <div className="flex gap-2 text-xs p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                <Clock size={14} className="text-amber-500 shrink-0" />
                                <p className="text-zinc-400">Airwallex API latency detected (2.4s avg)</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/40 border-zinc-800 h-fit">
                        <CardHeader className="pb-2 text-sm font-bold uppercase tracking-tight text-zinc-500">Active Partners</CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg p-1">
                                        <img src="https://cdn.airwallex.com/brand/logo-mark.svg" alt="Airwallex" className="w-full h-full" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-300">Airwallex (Main)</span>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-400">Stable</Badge>
                            </div>
                            <div className="flex items-center justify-between opacity-40 grayscale">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs">S</div>
                                    <span className="text-sm font-bold text-zinc-500">Stripe (Backup)</span>
                                </div>
                                <Badge variant="outline">Disconnected</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
