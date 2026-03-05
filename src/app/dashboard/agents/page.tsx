"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Plus, KeyRound, Copy, Trash2, Eye, EyeOff, Loader2, Zap, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(err => console.error("Clipboard fail:", err));
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }
};

export default function AgentsPage() {
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<any[]>([]);
    const [showKey, setShowKey] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form states
    const [newName, setNewName] = useState("");
    const [newLimit, setNewLimit] = useState("100");

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const userId = session.user.id;

            // 0. Ensure user exists in public.users (sync from auth.users)
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("id", userId)
                .single();

            if (userError && userError.code === 'PGRST116') {
                await supabase.from("users").insert({
                    id: userId,
                    email: session.user.email
                });
            }

            // 1. Fetch Agents (Cards)
            const { data, error } = await supabase
                .from("cards")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (!error && data) {
                setAgents(data);
            }
        } catch (err) {
            console.error("Fetch Agents Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgent = async () => {
        if (!newName) return;
        setIsCreating(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error: insertError } = await supabase.from("cards").insert({
                user_id: session.user.id,
                alias: newName,
                allocated_limit_usd: Number(newLimit),
                is_active: true,
                card_number_encrypted: `zk_live_${Math.random().toString(36).substring(7)}`
            });

            if (insertError) throw insertError;

            setNewName("");
            setOpen(false);
            fetchAgents();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create agent key");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        await supabase.from("cards").update({ is_active: false }).eq("id", id);
        fetchAgents();
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-zinc-400 mt-1">Manage your agents' API Passports and spending boundaries.</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <Plus className="mr-2 h-4 w-4" /> Create Agent Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Create New Agent Key</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                This key gives an AI Agent permission to spend from your Internal Balance.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-zinc-300">Agent Name / Alias</Label>
                                <Input
                                    id="name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g., AutoGPT_Primary"
                                    className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="limit" className="text-zinc-300">Monthly Spend Limit ($)</Label>
                                <Input
                                    id="limit"
                                    type="number"
                                    value={newLimit}
                                    onChange={(e) => setNewLimit(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-emerald-500"
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={handleCreateAgent}
                                disabled={isCreating || !newName}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-12 font-bold"
                            >
                                {isCreating ? <Loader2 className="animate-spin" /> : 'Generate SECURE_KEY'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Human Guide Section */}
            <Card className="bg-emerald-500/5 border-emerald-500/20 border-dashed">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl h-fit">
                            <ShieldCheck className="text-emerald-500" size={24} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-emerald-400">Zero-Trust Protocol Guide</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                To delegate payments to an AI (like Claude or AutoGPT), copy the <span className="text-zinc-200 font-mono">AGENT_PASSPORT</span> and paste it directly into the bot's chat.
                                The bot will automatically discover the Z-ZERO MCP tools and the <a href="/docs/sop" className="underline text-emerald-500/80 hover:text-emerald-400">Standard Operating Procedure</a> to handle payments autonomously.
                            </p>
                            <div className="flex gap-4 pt-2">
                                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span>Monthly limits enforced</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span>Single-use tokens</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-zinc-900/20 border-b border-zinc-800">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <KeyRound className="h-5 w-5 text-emerald-400" /> Active Agent Passports
                    </CardTitle>
                    <CardDescription>Never share these keys. They grant direct access to your collateralized funds.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-zinc-900/50 border-zinc-800">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead className="text-zinc-400 font-bold py-4">Agent Alias</TableHead>
                                <TableHead className="text-zinc-400 font-bold">Z_ZERO_SECURE_KEY</TableHead>
                                <TableHead className="text-zinc-400 font-bold">Status</TableHead>
                                <TableHead className="text-zinc-400 font-bold text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-zinc-500 italic">
                                        No active agent keys. Create one to start delegating payments.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agents.map(agent => (
                                    <TableRow key={agent.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-emerald-500/10 ${agent.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                    <Terminal className="h-4 w-4" />
                                                </div>
                                                <span className={`font-medium ${agent.is_active ? 'text-zinc-100' : 'text-zinc-500 line-through'}`}>
                                                    {agent.alias}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-zinc-500 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-md">
                                                    {showKey === agent.id ? agent.card_number_encrypted : 'zk_live_••••••••••••••••'}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-white"
                                                    onClick={() => setShowKey(showKey === agent.id ? null : agent.id)}
                                                >
                                                    {showKey === agent.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 transition-colors ${copiedId === agent.id ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`}
                                                    title="Copy Agent Passport Command"
                                                    onClick={() => {
                                                        const passportNote = `Initialize Z-ZERO Agent Passport:
KEY: ${agent.card_number_encrypted}
SOP: https://clawcard.store/docs/sop
MCP: mcp://resources/sop (Built-in)
ROLE: Autonomous Spending Agent
RULE: JIT-Auth | 30m-Burn | Zero-PII
---
System: Follow the SOP to execute payments. Never ask for raw card data.`;
                                                        copyToClipboard(passportNote);
                                                        setCopiedId(agent.id);
                                                        setTimeout(() => setCopiedId(null), 2000);
                                                    }}
                                                >
                                                    {copiedId === agent.id ? <Zap className="h-4 w-4 fill-current" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={agent.is_active
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
                                            }>
                                                {agent.is_active ? (
                                                    <span className="flex items-center gap-1"><Zap className="h-2 w-2 fill-current" /> Active</span>
                                                ) : 'Revoked'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {agent.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRevoke(agent.id)}
                                                    className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Revoke
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
