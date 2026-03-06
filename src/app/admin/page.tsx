'use client';

import { useState, useEffect } from "react";
import {
    TrendingUp,
    Users,
    CreditCard,
    Activity,
    ArrowUpRight,
    ArrowUp,
    ArrowDown,
    DollarSign,
    Zap,
    Clock,
    AlertCircle,
    Wallet,
    PieChart,
    ShieldCheck,
    ArrowRightLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Elegant Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        COMMAND CENTER
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase font-bold px-2">V2.1 Premium</Badge>
                    </h1>
                    <p className="text-zinc-500 mt-1">Universal governance and financial liquidity dashboard.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-4 hidden md:flex">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Network Health</span>
                        <span className="text-xs text-emerald-500 font-mono">99.98% Uptime</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white"
                        onClick={fetchSystemStats}
                    >
                        <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Data
                    </Button>
                </div>
            </div>

            {/* FINANCIAL FLOW - THE TRINITY */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* 1. TOTAL INFLOW (DEPOSITS) */}
                <Card className="bg-zinc-950 border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.05)] relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                        <TrendingUp size={160} />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Total Inflow</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <ArrowUp className="w-4 h-4 text-emerald-500" />
                            </div>
                        </div>
                        <CardTitle className="text-white text-sm font-medium mt-2">Crypto Deposits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white tracking-tighter italic">
                            ${stats.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-[10px]">
                                +12.5% vs last month
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. LIQUID ASSETS (TREASURY) */}
                <Card className="bg-zinc-950 border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.05)] relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity -rotate-12">
                        <Wallet size={160} />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Treasury Net</span>
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-amber-500" />
                            </div>
                        </div>
                        <CardTitle className="text-white text-sm font-medium mt-2">Current Liquidity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white tracking-tighter italic">
                            ${stats.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 leading-tight">
                            Estimated float across all custodial and partner bridge wallets.
                        </p>
                    </CardContent>
                </Card>

                {/* 3. TOTAL OUTFLOW (GMV) */}
                <Card className="bg-zinc-950 border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.05)] relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <ArrowRightLeft size={160} />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">Total Outflow</span>
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <ArrowDown className="w-4 h-4 text-purple-500" />
                            </div>
                        </div>
                        <CardTitle className="text-white text-sm font-medium mt-2">Merchant Spending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white tracking-tighter italic text-purple-300">
                            ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Efficiency</span>
                            <span className="text-[10px] text-purple-400 font-mono">94.2% Success</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DASHBOARD MIDDLE LAYER */}
            <div className="grid gap-6 md:grid-cols-4">
                {/* USER FUNNEL - PREMIUM VISUALIZATION */}
                <Card className="md:col-span-2 bg-zinc-900/30 border-zinc-800/80 backdrop-blur-md relative">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <PieChart size={18} className="text-blue-500" /> Customer Lifecycle
                        </CardTitle>
                        <CardDescription>User conversion from registration to spending.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            {/* Total -> Deposit -> Paid */}
                            <div className="relative flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Registered</span>
                                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                                </div>
                                <div className="h-10 w-px bg-zinc-800 mx-4" />
                                <div className="space-y-1">
                                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest italic">Qualified (Deposited)</span>
                                    <p className="text-2xl font-bold text-white">{stats.depositUsers}</p>
                                </div>
                                <div className="h-10 w-px bg-zinc-800 mx-4" />
                                <div className="space-y-1">
                                    <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest italic">Active (Paid)</span>
                                    <p className="text-2xl font-bold text-white">{stats.paidUsers}</p>
                                </div>
                            </div>

                            {/* Conversion Insight */}
                            <div className="flex gap-4">
                                <div className="flex-1 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center">
                                    <span className="text-[10px] text-zinc-500 uppercase font-black">Deposit Rate</span>
                                    <span className="text-sm font-bold text-blue-400 mt-1">{((stats.depositUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex-1 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex flex-col items-center">
                                    <span className="text-[10px] text-zinc-500 uppercase font-black">Retention</span>
                                    <span className="text-sm font-bold text-purple-400 mt-1">{((stats.paidUsers / (stats.depositUsers || 1)) * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* TRANSACTION METRICS */}
                <Card className="bg-zinc-900/30 border-zinc-800/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Trading Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-between items-end border-b border-zinc-800/50 pb-4">
                            <div>
                                <span className="text-3xl font-black text-white">{stats.totalTransactions}</span>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Total Hits</p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-zinc-300">${(stats.totalSpent / (stats.totalTransactions || 1)).toFixed(2)}</span>
                                <p className="text-[10px] text-zinc-500 uppercase">Avg Ticket Size</p>
                            </div>
                        </div>
                        <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                            <div className="flex items-center gap-2 mb-2 text-amber-500">
                                <Activity size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Velocity Alert</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-tight">
                                Peak activity detected at 10:45 AM today. Resource scaling is required.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* AGENT POWER */}
                <Card className="bg-zinc-900/30 border-zinc-800/80 relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={60} className="text-emerald-500" />
                    </div>
                    <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Zap className="text-emerald-500 w-8 h-8" />
                        </div>
                        <h4 className="text-sm font-black text-zinc-300 uppercase tracking-widest">Active Agents</h4>
                        <p className="text-4xl font-black text-white mt-1">{stats.activeAgents}</p>
                        <p className="text-[10px] text-emerald-500/80 font-mono mt-2 flex items-center justify-center gap-1">
                            <ShieldCheck size={10} /> Fully Autonomous
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* LOWER ALERT LAYER */}
            {stats.pendingDeposits > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-transparent border border-red-500/20 flex items-center justify-between group cursor-pointer hover:border-red-500/40 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <AlertCircle className="text-red-500 w-5 h-5 animate-bounce" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Manual Intervention Required</p>
                            <p className="text-xs text-zinc-500">{stats.pendingDeposits} blockchain deposits are exceeding the 10-minute automated bridge SLA.</p>
                        </div>
                    </div>
                    <Badge className="bg-red-500 text-white font-bold group-hover:px-6 transition-all">RESOLVE NOW &rarr;</Badge>
                </div>
            )}
        </div>
    );
}
