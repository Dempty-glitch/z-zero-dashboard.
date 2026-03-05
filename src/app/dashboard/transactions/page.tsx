"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    History,
    ArrowUpRight,
    Search,
    ChevronRight,
    FileText,
    ShieldCheck,
    Clock,
    Bot,
    Loader2,
    ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch transactions with card alias joined
            // We use the cards table to filter by user_id
            const { data, error } = await supabase
                .from("transactions")
                .select(`
                    *,
                    cards (
                        alias
                    )
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error("Fetch Transactions Error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Transaction History</h1>
                    <p className="text-zinc-400">Review all autonomous purchases and payment authorizations.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white" onClick={fetchTransactions}>
                        <History className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            {transactions.length === 0 ? (
                <Card className="bg-zinc-900/40 border-zinc-800 border-dashed py-20 flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-emerald-500/5 rounded-full mb-6">
                        <ShoppingBag className="h-12 w-12 text-zinc-700" strokeWidth={1.5} />
                    </div>
                    <CardTitle className="text-xl mb-2 text-zinc-200">No Transactions Yet</CardTitle>
                    <CardDescription className="max-w-md px-6 text-zinc-500 leading-relaxed font-mono text-xs uppercase tracking-widest">
                        Your AI Agents are ready but haven't made any purchases yet.
                        Give them a Passport Key and a mission to see their activity here.
                    </CardDescription>

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-6">
                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-900 text-left">
                            <Bot className="h-5 w-5 text-emerald-500 mb-3" />
                            <h4 className="text-xs font-bold text-zinc-300 uppercase mb-2">1. Delegate</h4>
                            <p className="text-[11px] text-zinc-500">Copy an Agent Passport from the Agents tab and give it to your AI.</p>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-900 text-left">
                            <Clock className="h-5 w-5 text-emerald-500 mb-3" />
                            <h4 className="text-xs font-bold text-zinc-300 uppercase mb-2">2. Automate</h4>
                            <p className="text-[11px] text-zinc-500">Your agent requests a JIT token and executes the payment autonomously.</p>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-900 text-left">
                            <ShieldCheck className="h-5 w-5 text-emerald-500 mb-3" />
                            <h4 className="text-xs font-bold text-zinc-300 uppercase mb-2">3. Verify</h4>
                            <p className="text-[11px] text-zinc-500">The transaction appears here instantly with full audit details.</p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-zinc-900/20 border-b border-zinc-800 flex flex-row items-center justify-between py-4">
                        <div className="space-y-0.5">
                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                            <CardDescription>Zero-Trust audit logs for all cards</CardDescription>
                        </div>
                        <Search className="h-4 w-4 text-zinc-600" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-zinc-900/50 border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 font-bold py-4">Timestamp</TableHead>
                                    <TableHead className="text-zinc-400 font-bold">Agent</TableHead>
                                    <TableHead className="text-zinc-400 font-bold">Merchant</TableHead>
                                    <TableHead className="text-zinc-400 font-bold">Amount</TableHead>
                                    <TableHead className="text-zinc-400 font-bold">Status</TableHead>
                                    <TableHead className="text-zinc-400 font-bold text-right pr-6">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors group">
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-200 text-sm">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-zinc-500 text-[10px] font-mono">
                                                    {new Date(tx.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                                    <Bot size={14} />
                                                </div>
                                                <span className="font-medium text-zinc-300">
                                                    {tx.cards?.alias || 'Unknown Agent'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-zinc-400 font-mono text-xs uppercase tracking-wider">
                                                {tx.merchant}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-lg font-bold text-white tracking-tighter">
                                                ${parseFloat(tx.amount).toFixed(2)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                tx.status === 'SUCCESS'
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }>
                                                {tx.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 group-hover:text-emerald-500 transition-colors">
                                                <ArrowUpRight size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
