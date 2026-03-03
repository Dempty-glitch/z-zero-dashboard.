'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ArrowLeft, Wallet as WalletIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { useAccount, useConnect, useSwitchChain, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseUnits } from 'viem';

// Token whitelist for frontend execution
const TOKEN_WHITELIST: Record<string, Record<string, { contract: `0x${string}`; decimals: number; wagmiId?: number }>> = {
    base: {
        USDC: { contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, wagmiId: 8453 },
    },
    ethereum: {
        USDC: { contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, wagmiId: 1 },
        USDT: { contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, wagmiId: 1 },
    },
};

const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;

// Simplified Chains (Removed BSC)
const NETWORKS = [
    { id: 'base', name: 'Base', supportedTokens: ['USDC'], method: 'wallet', color: '#0052FF' },
    { id: 'ethereum', name: 'Ethereum', supportedTokens: ['USDC', 'USDT'], method: 'wallet', color: '#627EEA' },
    { id: 'tron', name: 'Tron (TRC-20)', supportedTokens: ['USDT'], method: 'manual', color: '#FF0013' },
];

const TREASURY_EVM = (process.env.NEXT_PUBLIC_TREASURY_EVM || '') as `0x${string}`;
const TREASURY_TRON = 'TCeoBv5dDa17PAgUpy1XkuM56kj9i8BT9X';

type Step = 'token' | 'network' | 'amount' | 'verify' | 'result';

interface DepositModalProps {
    onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
    const [step, setStep] = useState<Step>('token');
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState<typeof NETWORKS[0] | null>(null);
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ status: string; message: string; amount?: number } | null>(null);

    // Web3 Hooks
    const { address, isConnected, chain: activeChain } = useAccount();
    const { connect } = useConnect();
    const { switchChainAsync } = useSwitchChain();
    const { writeContractAsync } = useWriteContract();

    const handleBack = () => {
        if (step === 'network') setStep('token');
        else if (step === 'amount') setStep('network');
        else if (step === 'verify') setStep('amount');
        setError('');
    };

    const handleTokenSelect = (token: string) => {
        setSelectedToken(token);
        setStep('network');
    };

    const handleNetworkSelect = (network: typeof NETWORKS[0]) => {
        setSelectedNetwork(network);
        setStep('amount');
    };

    const executeEVMDeposit = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const tokenConfig = TOKEN_WHITELIST[selectedNetwork!.id]?.[selectedToken!];
            if (!tokenConfig) throw new Error('Token configuration not found');

            // 1. Ensure connected
            if (!isConnected) {
                connect({ connector: injected() });
                setLoading(false);
                return;
            }

            // 2. Ensure correct network
            if (activeChain?.id !== tokenConfig.wagmiId) {
                await switchChainAsync({ chainId: tokenConfig.wagmiId! });
            }

            // 3. Execute Contract Write
            const parsedAmount = parseUnits(amount, tokenConfig.decimals);
            const hash = await writeContractAsync({
                abi: ERC20_ABI,
                address: tokenConfig.contract,
                functionName: 'transfer',
                args: [TREASURY_EVM, parsedAmount],
            });

            setTxHash(hash);
            setStep('verify');

            // Auto-verify after 5s
            setTimeout(() => handleVerify(hash), 5000);

        } catch (err: any) {
            console.error(err);
            setError(err.shortMessage || err.message || 'Failed to execute transaction');
            setLoading(false);
        }
    };

    const handleVerify = async (overrideHash?: string) => {
        const hashToVerify = overrideHash || txHash;
        if (!hashToVerify.trim()) {
            setError('Please enter the transaction hash');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const senderAuth = selectedNetwork?.method === 'wallet' ? address : null;

            const res = await fetch('/api/wallets/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: hashToVerify.trim(),
                    chainId: selectedNetwork?.id,
                    senderAddress: senderAuth,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Verification failed');
                setLoading(false);
                return;
            }

            setResult(data);
            setStep('result');
        } catch (err: any) {
            setError(err.message || 'Network error');
            setLoading(false);
        }
    };

    return (
        <Card className="border-zinc-800 bg-zinc-950/80 backdrop-blur-xl mt-4 lg:mt-0 lg:absolute lg:top-4 lg:right-4 lg:w-[420px] lg:z-50 shadow-2xl animate-in slide-in-from-right-4 duration-300 ring-1 ring-zinc-800">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                        {step !== 'token' && step !== 'result' && (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 text-zinc-400 hover:text-white">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <span>Deposit Funds</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {/* Stepper indicator */}
                <div className="flex gap-1 mt-2">
                    {['token', 'network', 'amount'].map((s, idx) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors ${['token', 'network', 'amount', 'verify', 'result'].indexOf(step) >= idx
                                    ? 'bg-emerald-500' : 'bg-zinc-800'
                                }`}
                        />
                    ))}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Step 1: Token Selection */}
                {step === 'token' && (
                    <div className="grid grid-cols-2 gap-3">
                        {['USDC', 'USDT'].map(t => (
                            <button
                                key={t}
                                onClick={() => handleTokenSelect(t)}
                                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group"
                            >
                                <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center text-xl font-bold ${t === 'USDC' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                                    } group-hover:scale-110 transition-transform`}>
                                    {t[0]}
                                </div>
                                <span className="font-medium">{t}</span>
                                <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Stablecoin</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Network Selection */}
                {step === 'network' && (
                    <div className="space-y-3">
                        <Label className="text-xs text-zinc-500 font-medium">Available networks for {selectedToken}</Label>
                        <div className="grid gap-2">
                            {NETWORKS.filter(n => n.supportedTokens.includes(selectedToken!)).map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => handleNetworkSelect(n)}
                                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                                        <span className="font-medium">{n.name}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800 uppercase">
                                        {n.method === 'wallet' ? 'Metamask' : 'Manual'}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Amount & Execution */}
                {step === 'amount' && selectedNetwork && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Selected Asset</span>
                                <span className="text-sm font-medium">{selectedToken} on {selectedNetwork.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep('token')} className="h-7 text-[10px] text-emerald-500 hover:text-emerald-400">Change</Button>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Amount to Deposit</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-zinc-900/50 border-zinc-800 h-14 text-2xl font-mono focus:ring-emerald-500/20 text-emerald-50"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-600">USD</div>
                            </div>
                        </div>

                        {selectedNetwork.method === 'wallet' ? (
                            <div className="space-y-4">
                                <Button
                                    className="w-full h-14 text-base font-bold shadow-lg shadow-emerald-900/10 bg-emerald-600 hover:bg-emerald-500 text-white"
                                    onClick={executeEVMDeposit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : !isConnected ? (
                                        <><WalletIcon className="mr-2 h-5 w-5" /> Connect Metamask</>
                                    ) : (
                                        'Deposit Now'
                                    )}
                                </Button>
                                {error && <p className="text-xs text-red-400 text-center font-medium">❌ {error}</p>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                                    <Label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Treasury Address (Tron)</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-[11px] text-zinc-300 font-mono break-all">{TREASURY_TRON}</code>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 text-[10px]"
                                            onClick={() => navigator.clipboard.writeText(TREASURY_TRON)}
                                        >Copy</Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400">Paste TxID after sending</Label>
                                    <Input
                                        placeholder="Enter Transaction ID"
                                        value={txHash}
                                        onChange={e => setTxHash(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 font-mono text-xs"
                                    />
                                </div>
                                <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold" onClick={() => handleVerify()} disabled={!txHash.trim() || loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Verify Transaction'}
                                </Button>
                                {error && <p className="text-xs text-red-400 text-center font-medium">❌ {error}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Verification Spinner */}
                {step === 'verify' && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 animate-pulse" />
                            <Loader2 className="absolute top-0 left-0 w-16 h-16 text-emerald-500 animate-spin" strokeWidth={1} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Verifying Payment</h3>
                            <p className="text-sm text-zinc-500 px-8">We're checking the blockchain to confirm your {selectedToken} deposit...</p>
                        </div>
                    </div>
                )}

                {/* Step 5: Final Result */}
                {step === 'result' && result && (
                    <div className="py-8 space-y-6 text-center animate-in zoom-in-95 duration-300">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Successfully Funded</h3>
                            <div className="text-4xl font-mono text-emerald-400">${result.amount?.toFixed(2)}</div>
                            <p className="text-zinc-500 text-sm px-10">Your credits are now available for your AI agents to use.</p>
                        </div>
                        <Button className="w-full h-12 bg-white text-black font-bold h-14" onClick={() => window.location.reload()}>
                            Go to Dashboard
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
