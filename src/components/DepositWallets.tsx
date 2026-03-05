'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DepositModalV2 from './DepositModalV2';

interface WalletData {
    evm_address: string;
    tron_address: string;
}

interface DepositWalletsProps {
    userId: string;
    onRefresh: () => void;
}

export default function DepositWallets({ userId, onRefresh }: DepositWalletsProps) {
    const [wallets, setWallets] = useState<WalletData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchWallets = async () => {
        try {
            const res = await fetch('/api/wallets/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });
            if (res.ok) setWallets(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchWallets();
    }, [userId]);

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between h-full relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-500" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Wallet className="text-emerald-400" size={24} />
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Add Funds</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                        Deposit USDT or USDC to fund your AI Agent cards instantly via Web3 or manual transfer.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex gap-3">
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-950/20 group/btn"
                >
                    <Plus className="mr-2 group-hover/btn:rotate-90 transition-transform duration-300" size={20} />
                    Deposit
                </Button>
                <Button
                    variant="outline"
                    className="h-14 w-14 rounded-2xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white group/history"
                >
                    <History className="text-zinc-500 group-hover/history:text-white transition-colors" size={20} />
                </Button>
            </div>

            {wallets && (
                <DepositModalV2
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    evmAddress={wallets.evm_address}
                    tronAddress={wallets.tron_address}
                    userId={userId}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
}
