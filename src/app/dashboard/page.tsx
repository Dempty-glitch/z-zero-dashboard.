"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Activity, Terminal, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DepositModal from "@/components/DepositModal";
import DepositWallets from "@/components/DepositWallets";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const [showDeposit, setShowDeposit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [pendingCredit, setPendingCredit] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [activeAgentsCount, setActiveAgentsCount] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        let userSub: any;
        let depositSub: any;

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            const userId = session.user.id;
            setUser(session.user);
            fetchDashboardData(userId);

            // 1. Subscribe to Wallet changes (Balance)
            userSub = supabase
                .channel('wallet_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${userId}`
                }, (payload: any) => {
                    if (payload.new) setBalance(Number(payload.new.balance));
                })
                .subscribe();

            // 2. Subscribe to Deposit changes
            depositSub = supabase
                .channel('deposit_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'crypto_deposits',
                    filter: `user_id=eq.${userId}`
                }, () => {
                    fetchDashboardData(userId); // Refresh list and pending count
                })
                .subscribe();
        };

        checkUser();

        return () => {
            if (userSub) userSub.unsubscribe();
            if (depositSub) depositSub.unsubscribe();
        };
    }, [router]);

    const fetchDashboardData = async (userId: string) => {
        setLoading(true);
        try {
            // 0. Ensure user exists in public.users (sync from auth.users)
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("id", userId)
                .single();

            if (userError && userError.code === 'PGRST116') {
                // User doesn't exist in public.users, create them
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    await supabase.from("users").insert({
                        id: userId,
                        email: authUser.email
                    });
                }
            }

            // 1. Fetch/Create Wallet
            const { data: walletData, error: walletError } = await supabase
                .from("wallets")
                .select("balance")
                .eq("user_id", userId)
                .single();

            if (walletError && walletError.code === 'PGRST116') {
                // Wallet doesn't exist, create it
                const { data: newWallet } = await supabase
                    .from("wallets")
                    .insert({ user_id: userId, balance: 0 })
                    .select()
                    .single();
                if (newWallet) setBalance(Number(newWallet.balance));
            } else if (walletData) {
                setBalance(Number(walletData.balance));
            }

            // 2. Fetch Pending Deposits (from pending_deposits table)
            const { data: pendingData } = await supabase
                .from("pending_deposits")
                .select("amount_usd")
                .eq("user_id", userId)
                .eq("status", "CONFIRMING");

            const pendingTotal = pendingData?.reduce((acc: number, curr: any) => acc + Number(curr.amount_usd || 0), 0) || 0;
            setPendingCredit(pendingTotal);

            // 3. Fetch Active Agents
            const { count: agentCount } = await supabase
                .from("cards")
                .select("*", { count: 'exact', head: true })
                .eq("user_id", userId)
                .eq("is_active", true);
            setActiveAgentsCount(agentCount || 0);

            // 4. Fetch Transactions (Spending)
            const { data: txData } = await supabase
                .from("transactions")
                .select(`
                    id,
                    amount,
                    merchant,
                    status,
                    created_at,
                    cards (alias)
                `)
                .eq("cards.user_id", userId) // Ensure we only get own transactions if card table has user_id
                .order("created_at", { ascending: false })
                .limit(10);

            // 5. Fetch Deposits
            const { data: depositData } = await supabase
                .from("crypto_deposits")
                .select("id, amount_usd, token_symbol, created_at, chain_id")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(10);

            // Calculate Total Spent
            const { data: spentData } = await supabase
                .from("transactions")
                .select("amount")
                .eq("status", "SUCCESS");

            const total = spentData?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
            setTotalSpent(total);

            // Combine for display
            const combinedTx = [
                ...(txData || []).map((t: any) => ({
                    id: t.id,
                    type: 'SPEND',
                    label: (t.cards as any)?.alias || 'Agent',
                    merchant: t.merchant,
                    status: t.status,
                    amount: -Number(t.amount),
                    date: t.created_at
                })),
                ...(depositData || []).map((d: any) => ({
                    id: d.id,
                    type: 'DEPOSIT',
                    label: `Deposit (${d.token_symbol})`,
                    merchant: d.chain_id.toUpperCase(),
                    status: 'Settled',
                    amount: Number(d.amount_usd),
                    date: d.created_at
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setTransactions(combinedTx.slice(0, 10));

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
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
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    <p className="text-muted-foreground mt-1">Manage your Crypto collateral and Agent spending.</p>
                </div>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    onClick={() => setShowDeposit(!showDeposit)}
                >
                    <Wallet className="mr-2 h-4 w-4" /> {showDeposit ? 'Close' : 'Deposit'}
                </Button>
            </div>

            {/* Deposit Modal — Slides in when toggled */}
            {showDeposit && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <DepositModal onClose={() => setShowDeposit(false)} />
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Internal USD Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        {pendingCredit > 0 ? (
                            <p className="text-xs text-yellow-500 mt-1 flex items-center animate-pulse">
                                + ${pendingCredit.toFixed(2)} pending confirmation
                            </p>
                        ) : (
                            <p className="text-xs text-emerald-500 mt-1 flex items-center">
                                Real-time collateral
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Agent Spent</CardTitle>
                        <Activity className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-red-400 mt-1 flex items-center">
                            Lifetime agent spend
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Agents</CardTitle>
                        <Terminal className="h-4 w-4 text-cyan-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{activeAgentsCount}</div>
                        <p className="text-xs text-zinc-500 mt-1">Operational virtual cards</p>
                    </CardContent>
                </Card>
            </div>

            {/* Deposit Wallets — Crypto deposit addresses for this user */}
            <div className="grid gap-4 md:grid-cols-2">
                {user && <DepositWallets userId={user.id} />}

                {/* Quick tip card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="font-semibold text-white text-sm mb-2">💡 How Deposits Work</h3>
                        <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                            <li>Copy your deposit address (EVM or Tron)</li>
                            <li>Send USDT or USDC from any exchange</li>
                            <li>Balance updates automatically in ~2 min</li>
                            <li>Your AI agent can now start spending</li>
                        </ol>
                    </div>
                    <div className="mt-4 text-xs text-gray-600">
                        Min deposit: $10 · Supported: USDT, USDC
                    </div>
                </div>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Live feed of deposits and agent expenditures.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-zinc-800">
                            <TableRow className="hover:bg-zinc-800/50">
                                <TableHead className="text-zinc-400">Entity/Network</TableHead>
                                <TableHead className="text-zinc-400">Merchant/Chain</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-zinc-500 italic">
                                        No transactions yet. Start by depositing funds.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map(tx => (
                                    <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className={`font-mono ${tx.type === 'SPEND' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                                            {tx.label}
                                        </TableCell>
                                        <TableCell>{tx.merchant}</TableCell>
                                        <TableCell>
                                            <Badge className={
                                                tx.status === 'Settled' || tx.status === 'SUCCESS'
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                            }>
                                                {tx.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {tx.amount < 0 ? '' : '+'}${Math.abs(tx.amount).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
// Trigger build: Tue Mar  3 23:34:26 +07 2026
