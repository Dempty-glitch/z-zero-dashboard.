"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Activity, Terminal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    <p className="text-muted-foreground mt-1">Manage your Crypto collateral and Agent spending.</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    <Wallet className="mr-2 h-4 w-4" /> Deposit USDC
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Internal USD Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">$1,250.00</div>
                        <p className="text-xs text-emerald-500 mt-1 flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +$500 from Base Network
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Agent Spent</CardTitle>
                        <Activity className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">$342.50</div>
                        <p className="text-xs text-red-400 mt-1 flex items-center">
                            <ArrowDownRight className="h-3 w-3 mr-1" /> -$45.00 today
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Agents</CardTitle>
                        <Terminal className="h-4 w-4 text-cyan-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">2</div>
                        <p className="text-xs text-zinc-500 mt-1">Using active API Keys</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>Recent Agent Transactions</CardTitle>
                    <CardDescription>JIT Payments executed by your AI Agents through the Partner network.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-zinc-800">
                            <TableRow className="hover:bg-zinc-800/50">
                                <TableHead className="text-zinc-400">Agent</TableHead>
                                <TableHead className="text-zinc-400">Merchant</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-mono text-cyan-400">AutoGPT_Demo</TableCell>
                                <TableCell>Anthropic API</TableCell>
                                <TableCell><Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">Settled</Badge></TableCell>
                                <TableCell className="text-right font-medium">-$15.00</TableCell>
                            </TableRow>
                            <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-mono text-cyan-400">AutoGPT_Demo</TableCell>
                                <TableCell>GitHub Copilot</TableCell>
                                <TableCell><Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">Settled</Badge></TableCell>
                                <TableCell className="text-right font-medium">-$10.00</TableCell>
                            </TableRow>
                            <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                                <TableCell className="font-mono text-cyan-400">Claude_Assistant</TableCell>
                                <TableCell>AWS Services</TableCell>
                                <TableCell><Badge className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20">Hold</Badge></TableCell>
                                <TableCell className="text-right font-medium">-$20.00</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
