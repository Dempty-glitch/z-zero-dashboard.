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

// Whitelisted token contracts per chain
const TOKEN_WHITELIST: Record<string, Record<string, { contract: `0x${string}`; decimals: number; wagmiId: number }>> = {
    base: {
        USDC: { contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, wagmiId: 8453 },
    },
    ethereum: {
        USDC: { contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, wagmiId: 1 },
        USDT: { contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, wagmiId: 1 },
    },
    bsc: {
        USDT: { contract: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, wagmiId: 56 },
    },
};

const ERC20_ABI = [{
    name: 'transfer',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
}] as const;

const NETWORKS = [
    { id: 'base', name: 'Base', tokens: ['USDC'], color: '#0052FF' },
    { id: 'ethereum', name: 'Ethereum', tokens: ['USDC', 'USDT'], color: '#627EEA' },
    { id: 'bsc', name: 'BNB Smart Chain', tokens: ['USDT'], color: '#F3BA2F' },
    { id: 'tron', name: 'Tron (TRC-20)', tokens: ['USDT'], color: '#FF0013', manual: true },
];

type Step = 'network' | 'amount' | 'verify' | 'result';

interface DepositModalProps {
    onClose: () => void;
    evmAddress?: string;
    tronAddress?: string;
}

export default function DepositModal({ onClose, evmAddress, tronAddress }: DepositModalProps) {
    const [step, setStep] = useState<Step>('network');
    const [selectedNetwork, setSelectedNetwork] = useState<typeof NETWORKS[0] | null>(null);
    const [selectedToken, setSelectedToken] = useState('');
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ status: string; message: string; amount?: number } | null>(null);

    const { address, isConnected, chain: activeChain } = useAccount();
    const { connect } = useConnect();
    const { switchChainAsync } = useSwitchChain();
    const { writeContractAsync } = useWriteContract();

    const handleNetworkSelect = (network: typeof NETWORKS[0]) => {
        setSelectedNetwork(network);
        setSelectedToken(network.tokens[0]);
        setStep('amount');
        setError('');
    };

    const handleDeposit = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            setError('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        // Tron: manual tx hash flow
        if (selectedNetwork?.manual) {
            setStep('verify');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const tokenConfig = TOKEN_WHITELIST[selectedNetwork!.id]?.[selectedToken];
            if (!tokenConfig) throw new Error('Token không được hỗ trợ');
            if (!evmAddress) throw new Error('Địa chỉ ví chưa được khởi tạo');

            // 1. Connect MetaMask nếu chưa
            if (!isConnected) {
                connect({ connector: injected() });
                setLoading(false);
                return;
            }

            // 2. Switch sang đúng chain
            if (activeChain?.id !== tokenConfig.wagmiId) {
                await switchChainAsync({ chainId: tokenConfig.wagmiId });
            }

            // 3. Gọi ERC-20 transfer() → MetaMask popup gas fee
            const parsedAmount = parseUnits(amount, tokenConfig.decimals);
            const hash = await writeContractAsync({
                abi: ERC20_ABI,
                address: tokenConfig.contract,
                functionName: 'transfer',
                args: [evmAddress as `0x${string}`, parsedAmount],
            });

            // 4. TX submitted — auto verify (no manual hash paste needed)
            setTxHash(hash);
            setStep('verify');
            setTimeout(() => autoVerify(hash), 5000);

        } catch (err: any) {
            const msg = err.shortMessage || err.message || 'Transaction thất bại';
            if (!msg.toLowerCase().includes('user rejected')) setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const autoVerify = async (hash: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/wallets/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: hash,
                    chainId: selectedNetwork?.id,
                    senderAddress: address,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setStep('result');
            } else {
                setError(data.error || 'Xác minh thất bại');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // For Tron: manual paste
    const handleManualVerify = async () => {
        if (!txHash.trim()) { setError('Vui lòng nhập Transaction Hash'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/wallets/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txHash: txHash.trim(), chainId: selectedNetwork?.id }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setStep('result');
            } else {
                setError(data.error || 'Xác minh thất bại');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const progressSteps = ['network', 'amount', 'verify'];
    const progressIdx = progressSteps.indexOf(step);

    return (
        <Card className="border-zinc-800 bg-zinc-950/80 backdrop-blur-xl mt-4 lg:mt-0 lg:absolute lg:top-4 lg:right-4 lg:w-[420px] lg:z-50 shadow-2xl animate-in slide-in-from-right-4 duration-300 ring-1 ring-zinc-800">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                        {step !== 'network' && step !== 'result' && (
                            <Button variant="ghost" size="icon"
                                onClick={() => {
                                    if (step === 'amount') setStep('network');
                                    else if (step === 'verify' && selectedNetwork?.manual) setStep('amount');
                                    setError('');
                                }}
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                            ><ArrowLeft className="h-4 w-4" /></Button>
                        )}
                        <span>Deposit Funds</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-1 mt-2">
                    {progressSteps.map((s, idx) => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${progressIdx >= idx ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                    ))}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">

                {/* Step 1: Chọn mạng */}
                {step === 'network' && (
                    <div className="space-y-3">
                        <Label className="text-xs text-zinc-500 font-medium">Chọn mạng nạp tiền</Label>
                        <div className="grid gap-2">
                            {NETWORKS.map((n) => (
                                <button key={n.id} onClick={() => handleNetworkSelect(n)}
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

                {/* Step 2: Số tiền + Token + Connect Wallet */}
                {step === 'amount' && selectedNetwork && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Header mạng đã chọn */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedNetwork.color }} />
                                <span className="text-sm font-medium">{selectedNetwork.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep('network')} className="h-7 text-[10px] text-emerald-500 hover:text-emerald-400">
                                Đổi mạng
                            </Button>
                        </div>

                        {/* Token selector nếu có nhiều lựa chọn */}
                        {selectedNetwork.tokens.length > 1 && (
                            <div className="flex gap-2">
                                {selectedNetwork.tokens.map(t => (
                                    <button key={t} onClick={() => setSelectedToken(t)}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${selectedToken === t
                                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                                                : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                    >{t}</button>
                                ))}
                            </div>
                        )}

                        {/* Địa chỉ nhận (ví riêng user) */}
                        {!selectedNetwork.manual && (
                            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Địa chỉ nhận (ví của bạn)</p>
                                <p className="text-[11px] font-mono text-emerald-300 break-all">{evmAddress || 'Đang khởi tạo...'}</p>
                            </div>
                        )}
                        {selectedNetwork.manual && (
                            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Địa chỉ nhận (ví Tron của bạn)</p>
                                <p className="text-[11px] font-mono text-emerald-300 break-all">{tronAddress || 'Đang khởi tạo...'}</p>
                            </div>
                        )}

                        {/* Số tiền */}
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Số tiền nạp</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-zinc-900/50 border-zinc-800 h-14 text-2xl font-mono focus:ring-emerald-500/20 text-emerald-50 pr-16"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500">{selectedToken}</div>
                            </div>
                        </div>

                        {/* EVM: Connect MetaMask + Deposit */}
                        {!selectedNetwork.manual && (
                            <div className="space-y-3">
                                {/* Wallet status */}
                                {isConnected && address && (
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-xs font-mono text-emerald-400 truncate">{address.slice(0, 6)}...{address.slice(-4)} connected</span>
                                    </div>
                                )}
                                <Button
                                    className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                                    onClick={handleDeposit}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin h-5 w-5" />
                                        : !isConnected ? <><WalletIcon className="mr-2 h-5 w-5" /> Connect MetaMask</>
                                            : `Deposit ${amount || '0'} ${selectedToken}`}
                                </Button>
                                {error && <p className="text-xs text-red-400 text-center">❌ {error}</p>}
                            </div>
                        )}

                        {/* Tron: chuyển sang bước dán hash */}
                        {selectedNetwork.manual && (
                            <Button
                                className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold"
                                onClick={() => setStep('verify')}
                                disabled={!amount}
                            >
                                Đã gửi → Paste TX Hash
                            </Button>
                        )}
                    </div>
                )}

                {/* Step 3a: EVM — đang chờ xác nhận blockchain */}
                {step === 'verify' && !selectedNetwork?.manual && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 animate-pulse" />
                            <Loader2 className="absolute top-0 left-0 w-16 h-16 text-emerald-500 animate-spin" strokeWidth={1} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Đang xác nhận trên {selectedNetwork?.name}</h3>
                            <p className="text-sm text-zinc-500 px-8">Đang kiểm tra giao dịch {selectedToken} của bạn trên blockchain...</p>
                            <p className="text-[10px] font-mono text-zinc-600 break-all px-4">{txHash.slice(0, 20)}...</p>
                        </div>
                        {error && (
                            <div className="space-y-2">
                                <p className="text-xs text-red-400">❌ {error}</p>
                                <Button size="sm" variant="outline" onClick={() => autoVerify(txHash)} className="border-zinc-700">
                                    Thử lại
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3b: Tron — dán TX hash */}
                {step === 'verify' && selectedNetwork?.manual && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <p className="text-sm text-zinc-400">
                            Gửi <strong className="text-white">{amount} USDT</strong> tới địa chỉ Tron của bạn, sau đó dán TxID vào bên dưới.
                        </p>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Transaction Hash (TxID)</Label>
                            <Input
                                placeholder="Paste TxID từ TronScan..."
                                value={txHash}
                                onChange={e => setTxHash(e.target.value)}
                                className="bg-zinc-900/50 border-zinc-800 font-mono text-xs h-12"
                            />
                        </div>
                        <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                            onClick={handleManualVerify} disabled={!txHash.trim() || loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Verify & Credit Balance'}
                        </Button>
                        {error && <p className="text-xs text-red-400 text-center">❌ {error}</p>}
                    </div>
                )}

                {/* Step 4: Thành công */}
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
                            <p className="text-zinc-500 text-sm px-10">Số dư đã sẵn sàng cho AI Agent của bạn sử dụng.</p>
                        </div>
                        <Button className="w-full h-14 bg-white text-black font-bold" onClick={() => window.location.reload()}>
                            Về Dashboard
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
