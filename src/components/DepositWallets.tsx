'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Wallet, Zap, RefreshCw } from 'lucide-react';

interface WalletData {
    evm_address: string;
    tron_address: string;
    wallet_index?: number;
    created?: boolean;
}

interface DepositWalletsProps {
    userId: string;
    onRefresh: () => void;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
    );
}

function NetworkBadge({ label, color }: { label: string; color: string }) {
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {label}
        </span>
    );
}

export default function DepositWallets({ userId, onRefresh }: DepositWalletsProps) {
    const [wallets, setWallets] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState<string | null>(null);

    const fetchOrGenerateWallets = async () => {
        try {
            setError(null);
            const res = await fetch('/api/wallets/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });

            if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate wallets');
            setWallets(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        setScanMessage(null);
        try {
            const res = await fetch('/api/wallets/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to scan network');

            setScanMessage(data.message);
            if (data.totalCredited > 0) {
                onRefresh(); // Trigger parent dashboard update
            }

            // clear success message after 5 seconds
            setTimeout(() => setScanMessage(null), 5000);
        } catch (err: any) {
            setScanMessage(err.message);
            setTimeout(() => setScanMessage(null), 5000);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        if (userId) fetchOrGenerateWallets();
    }, [userId]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-full flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                    <Wallet className="text-purple-400" size={20} />
                    <h3 className="font-semibold text-white">Deposit Wallets</h3>
                </div>
                <div className="space-y-3">
                    <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                <p className="text-sm text-red-400 mb-4">{error}</p>
                <button onClick={fetchOrGenerateWallets} className="flex items-center gap-2 text-sm text-gray-400">
                    <RefreshCw size={14} /> Try again
                </button>
            </div>
        );
    }

    const evmNetworks = ['BASE', 'BSC', 'ETH'];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Wallet className="text-emerald-400" size={16} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">Custodial Deposit Wallets</h3>
                        <p className="text-xs text-gray-500">Send USDT/USDC directly to these addresses</p>
                    </div>
                </div>

                <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-emerald-400 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
                    {scanning ? "Scanning..." : "Check Balance"}
                </button>
            </div>

            {scanMessage && (
                <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium border ${scanMessage.includes('found') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 border-white/5 text-gray-300'}`}>
                    {scanMessage}
                </div>
            )}

            <div className="space-y-3 flex-1">
                {/* EVM Wallet */}
                <div className="rounded-xl bg-black/30 border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-300">EVM Networks</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {evmNetworks.map(net => (
                                <NetworkBadge
                                    key={net}
                                    label={net}
                                    color={
                                        net === 'BASE' ? 'bg-blue-500/20 text-blue-300' :
                                            net === 'BSC' ? 'bg-yellow-500/20 text-yellow-300' :
                                                'bg-purple-500/20 text-purple-300'
                                    }
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <code className="text-xs text-gray-400 font-mono truncate max-w-[260px]">
                            {wallets?.evm_address}
                        </code>
                        <CopyButton text={wallets?.evm_address || ''} />
                    </div>
                </div>

                {/* Tron Wallet */}
                <div className="rounded-xl bg-black/30 border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-300">Tron Network</span>
                        </div>
                        <NetworkBadge label="TRON" color="bg-red-500/20 text-red-300" />
                    </div>
                    <div className="flex items-center justify-between">
                        <code className="text-xs text-gray-400 font-mono truncate max-w-[260px]">
                            {wallets?.tron_address}
                        </code>
                        <CopyButton text={wallets?.tron_address || ''} />
                    </div>
                </div>
            </div>

            <p className="mt-4 text-xs text-gray-600 text-center">
                💡 Send USDT/USDC to any address above. Funds auto-credit in ~2 minutes.
            </p>
        </div>
    );
}
