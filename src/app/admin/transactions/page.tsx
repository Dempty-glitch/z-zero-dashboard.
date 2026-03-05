'use client';

import { useState, useEffect } from "react";
import {
    History,
    Search,
    Filter,
    Bot,
    User,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Globe
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

export default function GlobalAudit() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("ALL");

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id,
                    created_at,
                    amount,
                    merchant,
                    status,
                    initiated_by,
                    card_id,
                    cards (alias, users (email))
                `)
                .order('created_at', { ascending: false });

            if (data) setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = transactions.filter(tx => {
        const matchesSearch = tx.merchant.toLowerCase().includes(search.toLowerCase()) ||
            tx.cards?.users?.email.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === "ALL" || tx.initiated_by === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <History className="text-amber-500" /> Global Audit Log
                    </h1>
                    <p className="text-zinc-500">Universal ledger of all system activity and agent spending.</p>
                </div>
                <Button variant="outline" className="border-zinc-800 bg-zinc-900 group">
                    <Download size={16} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> Export CSV
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <Input
                        placeholder="Search merchant or user email..."
                        className="pl-10 bg-black/40 border-zinc-800 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px] bg-black/40 border-zinc-800 rounded-xl">
                        <SelectValue placeholder="All Origins" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                        <SelectItem value="ALL">All Origins</SelectItem>
                        <SelectItem value="BOT">AI Agent (Bot)</SelectItem>
                        <SelectItem value="HUMAN">Manual (Human)</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" className="border-zinc-800" onClick={fetchTransactions}>Refresh</Button>
            </div>

            <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-900/50">
                        <TableRow className="hover:bg-transparent border-zinc-800">
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Timestamp</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Origin</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Merchant</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Amount</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">User Account</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-zinc-500 italic">Reading master encrypted logs...</TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-zinc-700">No matching activities found.</TableCell>
                            </TableRow>
                        ) : filtered.map((tx) => (
                            <TableRow key={tx.id} className="hover:bg-zinc-900/40 border-zinc-800 transition-colors">
                                <TableCell className="text-zinc-500 text-xs font-mono">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(tx.created_at).toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {tx.initiated_by === 'BOT' ? (
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                                            <Bot size={10} /> AI Agent
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1">
                                            <User size={10} /> Human
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="font-bold text-white tracking-tight">
                                    <div className="flex items-center gap-2">
                                        <Globe size={12} className="text-zinc-600" />
                                        {tx.merchant}
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono font-bold text-white">
                                    ${Number(tx.amount).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-zinc-400 text-sm">
                                    {tx.cards?.users?.email}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`${tx.status === 'SUCCESS' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                                            tx.status === 'FAILED' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                                                'text-zinc-500 border-zinc-800'
                                        }`}>
                                        {tx.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
