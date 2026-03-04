'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Deposit chain options
const CHAINS = [
    { id: 'base', name: 'Base', tokens: ['USDC'], method: 'wallet', color: '#0052FF' },
    { id: 'ethereum', name: 'Ethereum', tokens: ['USDC', 'USDT'], method: 'wallet', color: '#627EEA' },
    { id: 'bsc', name: 'BNB Chain', tokens: ['USDT'], method: 'wallet', color: '#F0B90B' },
    { id: 'tron', name: 'Tron (TRC-20)', tokens: ['USDT'], method: 'manual', color: '#FF0013' },
];

const TREASURY_EVM = process.env.NEXT_PUBLIC_TREASURY_EVM || '';
const TREASURY_TRON = 'TCeoBv5dDa17PAgUpy1XkuM56kj9i8BT9X';

type DepositStep = 'select' | 'transfer' | 'verify' | 'result';

export default function DepositModal() {
    const [step, setStep] = useState<DepositStep>('select');
    const [selectedChain, setSelectedChain] = useState<typeof CHAINS[0] | null>(null);
    const [selectedToken, setSelectedToken] = useState('');
    const [txHash, setTxHash] = useState('');
    const [amount, setAmount] = useState('');
    const [result, setResult] = useState<{ status: string; message: string; amount?: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const treasuryAddress = selectedChain?.id === 'tron' ? TREASURY_TRON : TREASURY_EVM;

    const handleChainSelect = (chain: typeof CHAINS[0]) => {
        setSelectedChain(chain);
        setSelectedToken(chain.tokens[0]);
        setStep('transfer');
        setError('');
    };

    const handleVerifyDeposit = async () => {
        if (!txHash.trim()) {
            setError('Please enter the transaction hash');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/wallets/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: txHash.trim(),
                    chainId: selectedChain?.id,
                    senderAddress: null, // Will be extracted from tx
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Verification failed');
                if (data.duplicate) setError('This transaction has already been credited.');
                setLoading(false);
                return;
            }

            setResult(data);
            setStep('result');
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep('select');
        setSelectedChain(null);
        setSelectedToken('');
        setTxHash('');
        setAmount('');
        setResult(null);
        setError('');
    };

    return (
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    💰 Deposit Stablecoins
                    {step !== 'select' && (
                        <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto text-xs text-zinc-400">
                            ← Back
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Step 1: Select Network */}
                {step === 'select' && (
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-400">Select a network to deposit stablecoins and fund your AI agents.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {CHAINS.map((chain) => (
                                <button
                                    key={chain.id}
                                    onClick={() => handleChainSelect(chain)}
                                    className="flex flex-col items-start gap-2 p-4 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 transition-all text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                                        <span className="font-medium text-sm">{chain.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {chain.tokens.map((t) => (
                                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 uppercase">
                                        {chain.method === 'wallet' ? '🦊 Web3 Wallet' : '📋 Paste TxID'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Transfer Instructions */}
                {step === 'transfer' && selectedChain && (
                    <div className="space-y-4">
                        {/* Token selector if multiple */}
                        {selectedChain.tokens.length > 1 && (
                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400">Select Token</Label>
                                <div className="flex gap-2">
                                    {selectedChain.tokens.map((t) => (
                                        <Button
                                            key={t}
                                            variant={selectedToken === t ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedToken(t)}
                                        >
                                            {t}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Treasury Address Display */}
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">
                                Send {selectedToken} ({selectedChain.name}) to this address:
                            </Label>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-xs break-all">
                                <span className="flex-1">{treasuryAddress}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0 text-xs"
                                    onClick={() => navigator.clipboard.writeText(treasuryAddress)}
                                >
                                    📋 Copy
                                </Button>
                            </div>
                        </div>

                        {/* For EVM chains: Web3 wallet option */}
                        {selectedChain.method === 'wallet' && (
                            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/50 text-xs text-blue-300">
                                💡 You can also send directly from your exchange (Binance, OKX) to the address above, then paste the TxHash below.
                            </div>
                        )}

                        {/* Amount input (optional, for reference only) */}
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Amount (for your reference)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>

                        {/* TxHash input */}
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">
                                After sending, paste your Transaction Hash here:
                            </Label>
                            <Input
                                placeholder="0x... or Tron TxID"
                                value={txHash}
                                onChange={(e) => setTxHash(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-300">
                                ❌ {error}
                            </div>
                        )}

                        <Button
                            className="w-full"
                            onClick={() => { setStep('verify'); handleVerifyDeposit(); }}
                            disabled={!txHash.trim()}
                        >
                            🔍 Verify Deposit
                        </Button>
                    </div>
                )}

                {/* Step 3: Verifying */}
                {step === 'verify' && loading && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                        <p className="text-sm text-zinc-400">Verifying transaction on {selectedChain?.name}...</p>
                        <p className="text-xs text-zinc-500">Checking blockchain for confirmed transfer to treasury</p>
                    </div>
                )}

                {/* Step 3b: Verify failed but not in result */}
                {step === 'verify' && !loading && error && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-sm text-red-300">
                            ❌ {error}
                        </div>
                        <Button variant="outline" onClick={() => { setStep('transfer'); setError(''); }}>
                            ← Try Again
                        </Button>
                    </div>
                )}

                {/* Step 4: Result */}
                {step === 'result' && result && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg border text-sm ${result.status === 'CONFIRMED'
                                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                                : result.status === 'CONFIRMING'
                                    ? 'bg-yellow-950/30 border-yellow-900/50 text-yellow-300'
                                    : 'bg-blue-950/30 border-blue-900/50 text-blue-300'
                            }`}>
                            {result.status === 'CONFIRMED' && '✅ '}
                            {result.status === 'CONFIRMING' && '⏳ '}
                            {result.status === 'UNCLAIMED' && '📨 '}
                            {result.message}
                        </div>
                        {result.amount && (
                            <div className="text-center">
                                <span className="text-3xl font-bold text-emerald-400">${result.amount.toFixed(2)}</span>
                                <p className="text-xs text-zinc-500 mt-1">Added to your Internal Balance</p>
                            </div>
                        )}
                        <Button className="w-full" onClick={handleReset}>
                            Make Another Deposit
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
