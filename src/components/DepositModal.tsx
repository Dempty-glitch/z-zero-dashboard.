'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ArrowLeft, CheckCircle2, Loader2, Copy, Check } from 'lucide-react';

// Supported networks for deposit
const NETWORKS = [
    { id: 'base', name: 'Base', type: 'evm', tokens: ['USDC'], color: '#0052FF' },
    { id: 'ethereum', name: 'Ethereum', type: 'evm', tokens: ['USDC', 'USDT'], color: '#627EEA' },
    { id: 'bsc', name: 'BNB Smart Chain', type: 'evm', tokens: ['USDT'], color: '#F3BA2F' },
    { id: 'tron', name: 'Tron (TRC-20)', type: 'tron', tokens: ['USDT'], color: '#FF0013' },
];

type Step = 'select' | 'deposit' | 'verify' | 'result';

interface DepositModalProps {
    onClose: () => void;
    evmAddress?: string;
    tronAddress?: string;
}

export default function DepositModal({ onClose, evmAddress, tronAddress }: DepositModalProps) {
    const [step, setStep] = useState<Step>('select');
    const [selectedNetwork, setSelectedNetwork] = useState<typeof NETWORKS[0] | null>(null);
    const [txHash, setTxHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [result, setResult] = useState<{ status: string; message: string; amount?: number } | null>(null);

    const depositAddress = selectedNetwork?.type === 'tron' ? tronAddress : evmAddress;

    const handleCopy = async () => {
        if (!depositAddress) return;
        await navigator.clipboard.writeText(depositAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerify = async () => {
        if (!txHash.trim()) { setError('Vui lòng dán Transaction Hash'); return; }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/wallets/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: txHash.trim(),
                    chainId: selectedNetwork?.id,
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-zinc-800 bg-zinc-950/80 backdrop-blur-xl mt-4 lg:mt-0 lg:absolute lg:top-4 lg:right-4 lg:w-[420px] lg:z-50 shadow-2xl animate-in slide-in-from-right-4 duration-300 ring-1 ring-zinc-800">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                        {step !== 'select' && step !== 'result' && (
                            <Button variant="ghost" size="icon" onClick={() => { setStep(step === 'verify' ? 'deposit' : 'select'); setError(''); }} className="h-8 w-8 text-zinc-400 hover:text-white">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <span>Deposit Funds</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {/* Stepper */}
                <div className="flex gap-1 mt-2">
                    {['select', 'deposit', 'verify'].map((s, idx) => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${['select', 'deposit', 'verify', 'result'].indexOf(step) >= idx ? 'bg-emerald-500' : 'bg-zinc-800'
                            }`} />
                    ))}
                </div>
            </CardHeader>
            <CardContent className="space-y-5">

                {/* Step 1: Choose Network */}
                {step === 'select' && (
                    <div className="space-y-3">
                        <Label className="text-xs text-zinc-500 font-medium">Choose Network</Label>
                        <div className="grid gap-2">
                            {NETWORKS.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => { setSelectedNetwork(n); setStep('deposit'); }}
                                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                                        <span className="font-medium">{n.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {n.tokens.map(t => (
                                            <Badge key={t} variant="outline" className="text-[10px] text-zinc-500 border-zinc-800">{t}</Badge>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Show Address + Copy */}
                {step === 'deposit' && selectedNetwork && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Selected network badge */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedNetwork.color }} />
                                <span className="text-sm font-medium">{selectedNetwork.name}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800">
                                {selectedNetwork.tokens.join(' / ')}
                            </Badge>
                        </div>

                        {/* Deposit Address */}
                        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                            <Label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                Your Deposit Address
                            </Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-[11px] text-emerald-300 font-mono break-all select-all">
                                    {depositAddress || 'Generating...'}
                                </code>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 px-3 text-xs shrink-0"
                                    disabled={!depositAddress}
                                    onClick={handleCopy}
                                >
                                    {copied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                                </Button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2 text-xs text-zinc-500">
                            <p>📌 Gửi <strong className="text-zinc-300">{selectedNetwork.tokens.join(' hoặc ')}</strong> đến địa chỉ trên từ bất kỳ sàn/ví nào.</p>
                            <p>⏱ Balance sẽ cập nhật sau khi xác minh TX (~1-2 phút).</p>
                        </div>

                        {/* Go to verify step */}
                        <Button
                            className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold"
                            onClick={() => setStep('verify')}
                        >
                            Đã gửi xong → Xác minh
                        </Button>
                    </div>
                )}

                {/* Step 3: Paste TX Hash + Verify */}
                {step === 'verify' && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-medium">Paste Transaction Hash</Label>
                            <Input
                                placeholder="0x... hoặc TxID"
                                value={txHash}
                                onChange={e => setTxHash(e.target.value)}
                                className="bg-zinc-900/50 border-zinc-800 font-mono text-xs h-12"
                            />
                        </div>
                        <Button
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                            onClick={handleVerify}
                            disabled={!txHash.trim() || loading}
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify & Credit Balance'}
                        </Button>
                        {error && <p className="text-xs text-red-400 text-center font-medium">❌ {error}</p>}
                    </div>
                )}

                {/* Step 4: Success */}
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
                        <Button className="w-full h-14 bg-white text-black font-bold" onClick={() => window.location.reload()}>
                            Go to Dashboard
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
