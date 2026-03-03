"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Plus, KeyRound, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AgentsPage() {
    const [showKey, setShowKey] = useState<string | null>(null);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
                    <p className="text-muted-foreground mt-1">Manage your agents' API Keys and spending limits.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <Plus className="mr-2 h-4 w-4" /> Create Agent Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
                        <DialogHeader>
                            <DialogTitle>Create New Agent Key</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                This key gives an AI Agent permission to spend from your Internal Balance.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-zinc-300">Agent Name / Alias</Label>
                                <Input id="name" placeholder="e.g., AutoGPT_Demo" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="limit" className="text-zinc-300">Monthly Spend Limit ($)</Label>
                                <Input id="limit" type="number" defaultValue="100" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">Generate SECURE_KEY</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-emerald-400" /> Active Agent Passports
                    </CardTitle>
                    <CardDescription>Never share these keys publicly. Treat them like credit cards.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-zinc-800">
                            <TableRow className="hover:bg-zinc-800/50">
                                <TableHead className="text-zinc-400">Agent Alias</TableHead>
                                <TableHead className="text-zinc-400">API Key</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-mono text-cyan-400 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="h-4 w-4 text-zinc-500" /> AutoGPT_Demo
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-zinc-500">
                                    <div className="flex items-center gap-2">
                                        {showKey === '1' ? 'zk_live_9f8d7c6b5a4...e3f2' : 'zk_live_••••••••••••••••'}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setShowKey(showKey === '1' ? null : '1')}>
                                            {showKey === '1' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell><Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                        <Trash2 className="mr-2 h-4 w-4" /> Revoke
                                    </Button>
                                </TableCell>
                            </TableRow>
                            <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-mono text-cyan-400 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="h-4 w-4 text-zinc-500" /> Claude_Assistant
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-zinc-500">
                                    <div className="flex items-center gap-2">
                                        {showKey === '2' ? 'zk_live_1a2b3c4d5e6...f7a8' : 'zk_live_••••••••••••••••'}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setShowKey(showKey === '2' ? null : '2')}>
                                            {showKey === '2' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell><Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                        <Trash2 className="mr-2 h-4 w-4" /> Revoke
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
