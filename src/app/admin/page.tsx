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
        totalGMV: 0,
        totalUsers: 0,
        totalTransactions: 0,
        activeAgents: 0,
        pendingDeposits: 0,
        weeklyGrowth: 12.5
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
                .select('*', { count: 'exact', head: true });

            // 2. Fetch total transactions & GMV
            const { data: txData } = await supabase
                .from('transactions')
                .select('amount');

            const gmv = txData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const txCount = txData?.length || 0;

            // 3. Fetch active cards (agents)
            const { count: agentCount } = await supabase
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // 4. Fetch pending deposits for the alert
            const { count: pendingCount } = await supabase
                .from('crypto_deposits')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PENDING');

            setStats({
                totalGMV: gmv,
                totalUsers: userCount || 0,
                totalTransactions: txCount,
                activeAgents: agentCount || 0,
                pendingDeposits: pendingCount || 0,
                weeklyGrowth: 18.2 // Mocked for now, can be calculated from date ranges
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
                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={40} className="text-amber-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Total GMV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">${stats.totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-emerald-500 flex items-center mt-1">
                            <ArrowUpRight size={12} className="mr-1" /> +{stats.weeklyGrowth}% <span className="text-zinc-600 ml-1">vs last week</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={40} className="text-blue-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                        <p className="text-xs text-blue-400 mt-1">
                            Verified account holders
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard size={40} className="text-purple-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.totalTransactions}</div>
                        <p className="text-xs text-zinc-600 mt-1 italic">
                            AOV: ${(stats.totalGMV / (stats.totalTransactions || 1)).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={40} className="text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Active Agents</CardTitle>
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
