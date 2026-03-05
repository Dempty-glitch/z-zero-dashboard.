"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Activity, Terminal, Loader2, Clock, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DepositWallets from "@/components/DepositWallets";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        const calculate = () => {
            const now = new Date().getTime();
            const end = new Date(expiresAt).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("Expired");
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
            }
        };
        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return <span className="font-mono">{timeLeft}</span>;
}

export default function DashboardPage() {
    const [showDeposit, setShowDeposit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [pendingCredit, setPendingCredit] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [activeAgentsCount, setActiveAgentsCount] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [virtualCards, setVirtualCards] = useState<any[]>([]);
    const [evmAddress, setEvmAddress] = useState<string>("");
    const [tronAddress, setTronAddress] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        let userSub: any;
        let depositSub: any;
        let cardSub: any;
        let tokenSub: any;

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

            // 3. Subscribe to Card changes
            cardSub = supabase
                .channel('card_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'cards',
                    filter: `user_id=eq.${userId}`
                }, () => fetchDashboardData(userId))
                .subscribe();

            // 4. Subscribe to Token changes
            tokenSub = supabase
                .channel('token_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'tokens'
                }, () => fetchDashboardData(userId))
                .subscribe();
        };

        checkUser();

        return () => {
            if (userSub) userSub.unsubscribe();
            if (depositSub) depositSub.unsubscribe();
            if (cardSub) cardSub.unsubscribe();
            if (tokenSub) tokenSub.unsubscribe();
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

            // 1.5 Fetch Deposit Wallets (Addresses for the Modal)
            const { data: depositWallets } = await supabase
                .from("deposit_wallets")
                .select("evm_address, tron_address")
                .eq("user_id", userId)
                .single();
            if (depositWallets) {
                setEvmAddress(depositWallets.evm_address);
                setTronAddress(depositWallets.tron_address);
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

            // 3.5 Fetch Virtual Cards (JIT Cards/Tokens)
            const { data: cardsData } = await supabase
                .from("cards")
                .select(`
                    id,
                    created_at,
                    allocated_limit_usd,
                    is_active,
                    tokens (
                        status,
                        expires_at,
                        authorized_amount
                    )
                `)
                .eq("user_id", userId)
                .order("created_at", { ascending: true });

            if (cardsData) {
                setVirtualCards(cardsData.map((c, idx) => ({
                    ...c,
                    displayId: `Card #${(idx + 1).toString().padStart(4, "0")}`,
                    activeToken: c.tokens?.[0] || null
                })));
            }

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

    const handleRefund = async (cardId: string) => {
        if (!user) return;
        if (!confirm("Are you sure you want to cancel this card and refund the funds to your wallet?")) return;

        try {
            const res = await fetch("/api/cards/refund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cardId, userId: user.id }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchDashboardData(user.id);
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error("Refund Error:", err);
            alert("Failed to process refund");
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
            </div>

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
                {user && <DepositWallets userId={user.id} onRefresh={() => fetchDashboardData(user.id)} />}

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

            {/* Virtual Cards Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CreditCard className="text-cyan-400" size={24} />
                        Active AI Virtual Cards
                    </h2>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-800">
                        Showing all cards
                    </Badge>
                </div>

                {virtualCards.length === 0 ? (
                    <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 italic">
                        No virtual cards issued yet. Use your AI Agent to request a payment.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {virtualCards.map((card) => {
                            const isBurned = card.activeToken?.status === 'USED' || card.activeToken?.status === 'EXPIRED' || !card.is_active;
                            return (
                                <div
                                    key={card.id}
                                    className={`relative group p-5 rounded-3xl border transition-all duration-300 ${isBurned
                                        ? 'bg-zinc-900/20 border-zinc-900 opacity-60 grayscale'
                                        : 'bg-zinc-900/50 border-zinc-800 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">{card.displayId}</p>
                                            <h3 className="text-lg font-bold text-white tracking-tight">
                                                ${Number(card.allocated_limit_usd).toFixed(2)}
                                            </h3>
                                        </div>
                                        <Badge className={`${card.activeToken?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            card.activeToken?.status === 'USED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                            }`}>
                                            {card.activeToken?.status || 'INACTIVE'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3">
                                        {!isBurned && card.activeToken?.expires_at && (
                                            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/5 border border-orange-500/10 rounded-xl px-3 py-2">
                                                <Clock size={14} className="animate-pulse" />
                                                <span>Expires in: </span>
                                                <CountdownTimer expiresAt={card.activeToken.expires_at} />
                                            </div>
                                        )}
                                        {isBurned && (
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800/10 rounded-xl px-3 py-2">
                                                <Activity size={14} />
                                                <span>Card Permanently Burned</span>
                                            </div>
                                        )}
                                        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${isBurned ? 'bg-zinc-700 w-full' : 'bg-gradient-to-r from-cyan-500 to-blue-500 w-1/3 animate-pulse'}`}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Visual card patterns */}
                                    <div className="absolute -bottom-2 -right-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                        <CreditCard size={100} />
                                    </div>

                                    {/* Refund Button for Active Cards */}
                                    {!isBurned && (
                                        <div className="mt-4 pt-4 border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRefund(card.id)}
                                                className="w-full text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl h-9"
                                            >
                                                Refund to Wallet
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
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
