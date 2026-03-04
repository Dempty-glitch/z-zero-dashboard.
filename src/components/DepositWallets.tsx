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

export default function DepositWallets({ userId }: DepositWalletsProps) {
    const [wallets, setWallets] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrGenerateWallets = async () => {
        try {
            setGenerating(true);
            setError(null);

            const res = await fetch('/api/wallets/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate wallets');
            }

            const data = await res.json();
            setWallets(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setGenerating(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchOrGenerateWallets();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Wallet className="text-purple-400" size={20} />
                    <h3 className="font-semibold text-white">My Deposit Wallets</h3>
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
                <div className="flex items-center gap-3 mb-3">
                    <Wallet className="text-red-400" size={20} />
                    <h3 className="font-semibold text-white">My Deposit Wallets</h3>
                </div>
                <p className="text-sm text-red-400 mb-4">{error}</p>
                <button
                    onClick={fetchOrGenerateWallets}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <RefreshCw size={14} />
                    <span>Try again</span>
                </button>
            </div>
        );
    }

    const evmNetworks = ['BASE', 'BSC', 'ETH'];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Wallet className="text-purple-400" size={16} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">My Deposit Wallets</h3>
                        <p className="text-xs text-gray-500">Send crypto to fund your bot</p>
                    </div>
                </div>
                {wallets?.created && (
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                        <Zap size={10} />
                        Just created
                    </span>
                )}
            </div>

            <div className="space-y-3">
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
