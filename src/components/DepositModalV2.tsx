'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Info, Copy, Check, ArrowRight, Wallet, Loader2 } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { base, bsc, mainnet } from 'wagmi/chains';
import { parseUnits } from 'viem';
import { TOKEN_WHITELIST } from '@/lib/deposit/config';
import { erc20Abi } from '@/lib/web3/abi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DepositModalV2Props {
    isOpen: boolean;
    onClose: () => void;
    evmAddress: string;
    tronAddress: string;
    userId: string;
    onSuccess?: () => void;
}

const CHAINS = [
    { id: 'base', name: 'Base', icon: '🔵', color: 'bg-blue-500', min: 1 },
    { id: 'bsc', name: 'BNB Smart Chain', icon: '🟡', color: 'bg-yellow-500', min: 1 },
    { id: 'ethereum', name: 'Ethereum', icon: '🟣', color: 'bg-purple-500', min: 10 },
    { id: 'tron', name: 'Tron (TRC-20)', icon: '🔴', color: 'bg-red-500', min: 1 },
];

export default function DepositModalV2({ isOpen, onClose, evmAddress, tronAddress, userId, onSuccess }: DepositModalV2Props) {
    const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
    const [selectedChainId, setSelectedChainId] = useState('base');
    const [selectedToken, setSelectedToken] = useState('USDC');
    const [amount, setAmount] = useState('10');
    const [copied, setCopied] = useState(false);

    // Wagmi Hooks
    const { isConnected, chainId: activeChainId, address: walletAddress } = useAccount();
    const { switchChain } = useSwitchChain();
    const { data: hash, writeContract, isPending: isConfirming, error: writeError } = useWriteContract();

    const { isLoading: isWaiting, isSuccess: isTxConfirmed, data: receipt } = useWaitForTransactionReceipt({
        hash,
    });

    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial token selection based on chain
    useEffect(() => {
        if (selectedChainId === 'base') setSelectedToken('USDC');
        else if (selectedChainId === 'bsc') setSelectedToken('USDT');
        else if (selectedChainId === 'ethereum') setSelectedToken('USDT');
        else if (selectedChainId === 'tron') setSelectedToken('USDT');
    }, [selectedChainId]);

    const activeChainConfig = CHAINS.find(c => c.id === selectedChainId);
    const availableTokens = TOKEN_WHITELIST[selectedChainId] ? Object.keys(TOKEN_WHITELIST[selectedChainId]) : ['USDT'];
    const currentRecipient = selectedChainId === 'tron' ? tronAddress : evmAddress;

    const handleCopy = () => {
        navigator.clipboard.writeText(currentRecipient);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleContinue = async () => {
        setError(null);
        if (selectedChainId === 'tron') {
            // Tron is always manual for now
            setStep('confirm');
            return;
        }

        // EVM auto-deposit flow
        if (!isConnected) {
            // AppKit button handles connection, but we can nudge
            setError("Please connect your wallet first.");
            return;
        }

        const targetWagmiId = selectedChainId === 'base' ? base.id : selectedChainId === 'bsc' ? bsc.id : mainnet.id;
        if (activeChainId !== targetWagmiId) {
            switchChain({ chainId: targetWagmiId });
            return;
        }

        const tokenInfo = TOKEN_WHITELIST[selectedChainId]?.[selectedToken];
        if (!tokenInfo) return;

        try {
            const amountBN = parseUnits(amount, tokenInfo.decimals);
            writeContract({
                address: tokenInfo.contract as `0x${string}`,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [evmAddress as `0x${string}`, amountBN],
            });
        } catch (e: any) {
            setError(e.message);
        }
    };

    // Auto-verify when transaction is confirmed
    useEffect(() => {
        if (isTxConfirmed && receipt) {
            const verify = async () => {
                setVerifying(true);
                try {
                    const res = await fetch('/api/wallets/deposit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            txHash: receipt.transactionHash,
                            chainId: selectedChainId
                        })
                    });
                    if (res.ok) {
                        setStep('success');
                        if (onSuccess) onSuccess();
                    } else {
                        const d = await res.json();
                        setError(d.error || "Verification failed");
                    }
                } catch (e: any) {
                    setError(e.message);
                } finally {
                    setVerifying(false);
                }
            };
            verify();
        }
    }, [isTxConfirmed, receipt, selectedChainId, userId, onSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-[440px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-900">
                    <div className="flex items-center gap-2">
                        {step !== 'select' && step !== 'success' && (
                            <button onClick={() => setStep('select')} className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-400">
                                <ChevronDown className="rotate-90" size={20} />
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-white">Transfer Crypto</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {step === 'select' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">From Chain</label>
                                    <div className="relative group">
                                        <select
                                            value={selectedChainId}
                                            onChange={(e) => setSelectedChainId(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                                        >
                                            {CHAINS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-white transition-colors" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">From Token</label>
                                    <div className="relative group">
                                        <select
                                            value={selectedToken}
                                            onChange={(e) => setSelectedToken(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                                        >
                                            {availableTokens.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-white transition-colors" size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500">Min Deposit</span>
                                    <span className="text-white font-medium">${activeChainConfig?.min} {selectedToken}</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase">Deposit Address</span>
                                        <Badge variant="outline" className="text-[10px] uppercase border-zinc-800 text-zinc-400">{selectedChainId}</Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/40 border border-zinc-800 rounded-2xl px-4 py-3 font-mono text-xs text-emerald-400 break-all">
                                            {currentRecipient || 'Generating...'}
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-2xl text-zinc-300 hover:text-white transition-all active:scale-95"
                                        >
                                            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-3">
                                <Info className="text-orange-500 shrink-0" size={18} />
                                <p className="text-[11px] text-orange-200/80 leading-relaxed">
                                    Please only send <span className="text-orange-400 font-bold">{selectedToken}</span> via the <span className="text-orange-400 font-bold">{activeChainConfig?.name}</span> network. Sending other funds to this address will result in permanent loss.
                                </p>
                            </div>

                            <div className="pt-2 space-y-3">
                                <div className="flex items-center justify-center">
                                    <appkit-button />
                                </div>

                                <Button
                                    onClick={handleContinue}
                                    disabled={isConfirming || isWaiting || verifying || !evmAddress}
                                    className="w-full h-14 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-base font-bold shadow-lg shadow-orange-950/20 transition-all active:scale-[0.98]"
                                >
                                    {isConfirming ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={20} /> Confirming...</span> :
                                        isWaiting ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={20} /> Waiting for Block...</span> :
                                            verifying ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={20} /> Verifying...</span> :
                                                "Continue"}
                                </Button>

                                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                                {writeError && <p className="text-[10px] text-red-500/60 text-center truncate">{writeError.message}</p>}
                            </div>
                        </>
                    )}

                    {step === 'confirm' && (
                        <div className="py-8 text-center space-y-6 animate-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                                <ArrowRight className="text-blue-500" size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Confirm Deposit</h3>
                                <p className="text-sm text-zinc-500 px-8">
                                    Please send exactly <span className="text-white font-bold">{amount} {selectedToken}</span> to your Tron address.
                                </p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 font-mono text-sm text-blue-400">
                                {tronAddress}
                            </div>
                            <Button onClick={() => setStep('select')} className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl">
                                I've sent the funds
                            </Button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-12 text-center space-y-6 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                <Check className="text-emerald-500" size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">Deposit Successful</h3>
                                <p className="text-zinc-500">Your funds have been credited to your account.</p>
                            </div>
                            <Button onClick={onClose} className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold">
                                Done
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
