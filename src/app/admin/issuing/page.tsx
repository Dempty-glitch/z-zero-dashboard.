'use client';

import { useState, useEffect } from "react";
import {
    Settings,
    ShieldCheck,
    Zap,
    Globe,
    Database,
    RefreshCcw,
    CheckCircle2,
    AlertCircle,
    Server,
    CreditCard,
    Key,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PartnerConfigPage() {
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        // Simulate API check
        await new Promise(r => setTimeout(r, 1500));

        setIsTesting(false);
        setTestResult({
            success: true,
            message: "Successfully authenticated with Airwallex API (DEMO Environment)"
        });
    };

    if (!mounted) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Settings className="text-amber-500" /> Partner Configuration
                    </h1>
                    <p className="text-zinc-500 mt-1 max-w-2xl">
                        Manage external API connections for card issuing, banking partners, and AI infrastructure.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1">
                        <Activity className="w-3 h-3 mr-1.5 animate-pulse" /> All Systems Nominal
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Partner: Airwallex */}
                <Card className="lg:col-span-2 bg-zinc-900/30 border-zinc-800 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <CreditCard size={120} />
                    </div>

                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <Globe className="text-blue-500 w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Airwallex Issuing</CardTitle>
                                    <CardDescription className="text-zinc-500">Primary Virtual Card Partner</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-blue-400 border-blue-500/30">DEMO MODE</Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest flex items-center gap-1.5">
                                    <Key size={10} /> Client Identifier
                                </Label>
                                <Input
                                    readOnly
                                    value="awx_cli_******************"
                                    className="bg-black/50 border-zinc-800 text-zinc-400 font-mono text-xs h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck size={10} /> API Secret Key
                                </Label>
                                <Input
                                    readOnly
                                    type="password"
                                    value="********************************"
                                    className="bg-black/50 border-zinc-800 text-zinc-400 font-mono text-xs h-11"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Switch id="jit-funding" checked={true} />
                                <Label htmlFor="jit-funding" className="text-xs text-zinc-400 cursor-pointer hover:text-white transition-colors">
                                    Enable JIT (Just-In-Time) Funding
                                </Label>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    onClick={handleTestConnection}
                                    disabled={isTesting}
                                >
                                    {isTesting ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                    Test Connection
                                </Button>
                            </div>
                        </div>

                        {testResult && (
                            <div className={`p-4 rounded-xl border ${testResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'} flex items-start gap-3 animate-in slide-in-from-top-2`}>
                                {testResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                                <p className="text-xs font-medium">{testResult.message}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Secondary Info/Stats */}
                <div className="space-y-6">
                    <Card className="bg-zinc-900/10 border-zinc-800/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-tighter">
                                <Server size={14} /> Webhook Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Authorization Callback</span>
                                    <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px] h-5 rounded-md">LISTENING</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Transaction Updates</span>
                                    <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px] h-5 rounded-md">LISTENING</Badge>
                                </div>
                                <div className="pt-2">
                                    <p className="text-[10px] text-zinc-600 font-mono truncate">
                                        URL: https://z-zero-api.vercel.app/api/webhooks/airwallex
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-500/5 border-amber-500/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-amber-500/80 flex items-center gap-2">
                                <ShieldCheck size={16} /> Partner Policy
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                                Credentials shown here are partially masked for security. These settings are restricted to SuperAdmins. Updating keys requires a server restart or manual environment flush.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* AI Infrastructure Config placeholder */}
            <div className="pt-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="text-blue-400 w-5 h-5" /> AI Model Infrastructure
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['OpenAI (GPT-4o)', 'Anthropic (Claude-3.5)', 'Google (Gemini-1.5)', 'DeepSeek (V3)'].map((p) => (
                        <div key={p} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-all group relative overflow-hidden">
                            <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <Zap size={60} />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-zinc-300">{p}</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            </div>
                            <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors italic">API Key Connected</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
