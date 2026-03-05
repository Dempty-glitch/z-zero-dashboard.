'use client';

import { useState, useEffect } from "react";
import {
    Clock,
    CheckCircle2,
    XCircle,
    ExternalLink,
    RefreshCcw,
    Search,
    Filter,
    ArrowRightLeft,
    Wallet,
    ShieldAlert
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function DepositReview() {
    const [deposits, setDeposits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [overrideMode, setOverrideMode] = useState(false);
    const [adminTxHash, setAdminTxHash] = useState("");
    const [adminUserEmail, setAdminUserEmail] = useState("");
    const [adminChain, setAdminChain] = useState("base");
    const [verifyingAdmin, setVerifyingAdmin] = useState(false);

    useEffect(() => {
        fetchDeposits();
    }, []);

    const fetchDeposits = async () => {
        setLoading(true);
        try {
            // We fetch from crypto_deposits which contains both confirmed and pending transfers
            const { data, error } = await supabase
                .from('crypto_deposits')
                .select(`
                    id,
                    created_at,
                    tx_hash,
                    amount_usd,
                    token_symbol,
                    chain_id,
                    status,
                    user_id,
                    users (email)
                `)
                .order('created_at', { ascending: false });

            if (data) setDeposits(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdminVerify = async () => {
        if (!adminTxHash || !adminUserEmail) {
            toast.error("Please provide both Email and TxHash");
            return;
        }

        const pin = window.prompt("Enter SuperMod PIN to confirm administrative override:");
        if (pin !== "000000") {
            toast.error("Invalid Admin PIN");
            return;
        }

        setVerifyingAdmin(true);
        try {
            // 1. Resolve user ID from email
            const { data: userData, error: userErr } = await supabase
                .from('users')
                .select('id')
                .eq('email', adminUserEmail)
                .single();

            if (userErr || !userData) {
                toast.error("User not found with this email");
                return;
            }

            // 2. Call the deposit verification API (it's secure and handles balance + DB)
            const res = await fetch('/api/wallets/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    txHash: adminTxHash,
                    chainId: adminChain
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success(`Verification Successful! $${result.amount} credited.`);
                setAdminTxHash("");
                setAdminUserEmail("");
                fetchDeposits();
            } else {
                toast.error(result.error || "Verification failed");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setVerifyingAdmin(false);
        }
    };

    const handleConfirm = async (deposit: any) => {
        const pin = window.prompt("Enter SuperMod PIN to confirm this transaction:");
        if (pin !== "000000") { // Placeholder for PIN logic
            toast.error("Invalid Admin PIN");
            return;
        }

        setConfirmingId(deposit.id);
        try {
            // 1. Update deposit status
            const { error: updateError } = await supabase
                .from('crypto_deposits')
                .update({ status: 'CONFIRMED' })
                .eq('id', deposit.id);

            if (updateError) throw updateError;

            // 2. Fetch current wallet balance
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', deposit.user_id)
                .single();

            const currentBalance = Number(wallet?.balance || 0);

            // 3. Credit the balance
            const { error: walletError } = await supabase
                .from('wallets')
                .update({ balance: currentBalance + Number(deposit.amount_usd) })
                .eq('user_id', deposit.user_id);

            if (walletError) throw walletError;

            // 4. Log to Audit Logs
            await supabase.from('admin_audit_logs').insert({
                action_type: 'APPROVE_DEPOSIT',
                target_user_id: deposit.user_id,
                metadata: { deposit_id: deposit.id, amount: deposit.amount_usd, tx_hash: deposit.tx_hash }
            });

            toast.success("Deposit processed successfully!");
            fetchDeposits();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Manual confirmation failed");
        } finally {
            setConfirmingId(null);
        }
    };

    const getExplorerUrl = (chainId: string, hash: string) => {
        const cleanHash = hash.split('_')[1] || hash;
        if (chainId === 'base') return `https://basescan.org/tx/${cleanHash}`;
        if (chainId === 'tron') return `https://tronscan.org/#/transaction/${cleanHash}`;
        if (chainId === 'bsc') return `https://bscscan.com/tx/${cleanHash}`;
        return `https://etherscan.io/tx/${cleanHash}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ArrowRightLeft className="text-amber-500" /> Financial Reconciliation
                    </h1>
                    <p className="text-zinc-500">Verify and manually confirm incoming crypto transfers.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={overrideMode ? "secondary" : "outline"}
                        className={overrideMode ? "bg-amber-500 text-black border-none" : "border-zinc-800 bg-zinc-900"}
                        onClick={() => setOverrideMode(!overrideMode)}
                    >
                        <ShieldAlert size={16} className="mr-2" />
                        {overrideMode ? "Hide Form" : "Admin Override"}
                    </Button>
                    <Button variant="outline" className="border-zinc-800 bg-zinc-900" onClick={fetchDeposits}>
                        <RefreshCcw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Ledger
                    </Button>
                </div>
            </div>

            {overrideMode && (
                <div className="p-6 bg-zinc-950 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 text-amber-500 mb-4">
                        <ShieldAlert size={18} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Administrative Override Tool</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Target User Email</label>
                            <Input
                                placeholder="customer@email.com"
                                className="bg-black border-zinc-800 text-zinc-300 h-10"
                                value={adminUserEmail}
                                onChange={(e) => setAdminUserEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Network</label>
                            <select
                                className="w-full bg-black border border-zinc-800 text-zinc-300 h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                                value={adminChain}
                                onChange={(e) => setAdminChain(e.target.value)}
                            >
                                <option value="base">Base</option>
                                <option value="bsc">BSC (Smart Chain)</option>
                                <option value="ethereum">Ethereum</option>
                                <option value="tron">Tron (TRC-20)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 md:col-span-1">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase">Transaction Hash</label>
                            <Input
                                placeholder="0x... or TxID"
                                className="bg-black border-zinc-800 text-amber-500 font-mono text-xs h-10"
                                value={adminTxHash}
                                onChange={(e) => setAdminTxHash(e.target.value)}
                            />
                        </div>
                        <Button
                            className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-10"
                            onClick={handleAdminVerify}
                            disabled={verifyingAdmin}
                        >
                            {verifyingAdmin ? "Verifying..." : "Pull & Verify Now"}
                        </Button>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-3 italic">
                        * This tool will fetch the transaction data directly from the blockchain and credit the specified user balance if valid.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-900/50">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Source Entity</TableHead>
                                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Amount (USD)</TableHead>
                                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Network</TableHead>
                                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Hash</TableHead>
                                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 text-zinc-500 italic">Scanning blockchain adapters...</TableCell>
                                </TableRow>
                            ) : deposits.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 text-zinc-700">No deposit records found.</TableCell>
                                </TableRow>
                            ) : deposits.map((dep) => (
                                <TableRow key={dep.id} className="hover:bg-zinc-900/40 border-zinc-800 transition-colors">
                                    <TableCell>
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold text-white">{dep.users?.email}</p>
                                            <p className="text-[10px] text-zinc-600 font-mono">{dep.user_id.slice(0, 8)}...</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-emerald-400 font-bold">
                                        +${Number(dep.amount_usd).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize text-[10px] border-zinc-800">
                                            {dep.chain_id}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={getExplorerUrl(dep.chain_id, dep.tx_hash)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1"
                                        >
                                            <span className="font-mono text-xs">{dep.tx_hash.slice(0, 8)}...</span>
                                            <ExternalLink size={10} />
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            dep.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                dep.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/10 animate-pulse'
                                        }>
                                            {dep.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {dep.status !== 'CONFIRMED' && dep.status !== 'FAILED' && (
                                            <Button
                                                size="sm"
                                                className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-7 rounded-lg text-[11px]"
                                                onClick={() => handleConfirm(dep)}
                                                disabled={confirmingId === dep.id}
                                            >
                                                {confirmingId === dep.id ? "Processing..." : "Manual Confirm"}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 space-y-4">
                        <div className="flex items-center gap-2 text-amber-500">
                            <ShieldAlert size={20} />
                            <h3 className="font-bold">Protocol Alert</h3>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Manual confirmation should <span className="text-white font-bold underline">only</span> be used when the automated bridge fails to detect a transaction after 30 minutes.
                            <br /><br />
                            Always verify the amount and recipient address on TronScan/BaseScan before confirming.
                        </p>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Network Load</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">Tron (TRC-20)</span>
                                    <span className="text-emerald-500">Fast (1 min)</span>
                                </div>
                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[90%]" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">Base</span>
                                    <span className="text-emerald-500">Optimal</span>
                                </div>
                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
