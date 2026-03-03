"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Plus, KeyRound, Copy, Trash2, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function AgentsPage() {
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<any[]>([]);
    const [showKey, setShowKey] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form states
    const [newName, setNewName] = useState("");
    const [newLimit, setNewLimit] = useState("100");

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from("cards")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setAgents(data);
        }
        setLoading(false);
    };

    const handleCreateAgent = async () => {
        if (!newName) return;
        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // In a real scenario, this would call an API that interacts with Airwallex
            // For now, we simulate agent key generation in the DB
            const { error } = await supabase.from("cards").insert({
                user_id: session.user.id,
                alias: newName,
                allocated_limit_usd: Number(newLimit),
                is_active: true,
                // Mock encrypted details for UI
                card_number_encrypted: `zk_live_${Math.random().toString(36).substring(7)}`
            });

            if (error) throw error;

            setNewName("");
            fetchAgents();
        } catch (err) {
            console.error(err);
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
                    <h1 className="text-3xl font-bold tracking-tight text-white">AI Agents</h1>
                    <p className="text-zinc-400 mt-1">Manage your agents' API Passports and spending boundaries.</p>
                </div>

                <Dialog>
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
                                                    className="h-8 w-8 text-zinc-500 hover:text-white"
                                                    onClick={() => navigator.clipboard.writeText(agent.card_number_encrypted || '')}
                                                >
                                                    <Copy className="h-4 w-4" />
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
