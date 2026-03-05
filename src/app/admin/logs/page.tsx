'use client';

import { useState, useEffect } from "react";
import {
    ShieldAlert,
    Search,
    Calendar,
    User,
    Info,
    Activity,
    Filter,
    Shield,
    Trash2,
    Lock
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_audit_logs')
                .select(`
                    id,
                    created_at,
                    action_type,
                    metadata,
                    admin_id,
                    target_user_id,
                    admin:users!admin_id (email),
                    target:users!target_user_id (email)
                `)
                .order('created_at', { ascending: false });

            if (data) setLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const actionColors: Record<string, string> = {
        'APPROVE_DEPOSIT': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        'BAN_USER': 'text-red-500 bg-red-500/10 border-red-500/20 font-black',
        'LOCK_CARD': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        'PROMOTE_ADMIN': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        'DEMOTE_ADMIN': 'text-zinc-400 bg-zinc-900 border-zinc-800',
    };

    const filtered = logs.filter(log => {
        const adminEmail = log.admin?.email || "";
        const targetEmail = log.target?.email || "";
        const matchesSearch = adminEmail.toLowerCase().includes(search.toLowerCase()) ||
            targetEmail.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "ALL" || log.action_type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="text-red-500" /> Administrative Audit
                    </h1>
                    <p className="text-zinc-500">SuperMod Oversight: Monitor all administrative overrides and financial approvals.</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-right">
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Master Logs</p>
                    <p className="text-xs text-zinc-500 italic">Logs are immutable once written.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <Input
                        placeholder="Filter by Admin or Target Email..."
                        className="pl-10 bg-black/40 border-zinc-800 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px] bg-black/40 border-zinc-800 rounded-xl">
                        <SelectValue placeholder="Action Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                        <SelectItem value="ALL">All Actions</SelectItem>
                        <SelectItem value="APPROVE_DEPOSIT">Approve Deposit</SelectItem>
                        <SelectItem value="BAN_USER">Ban User</SelectItem>
                        <SelectItem value="PROMOTE_ADMIN">Promote Admin</SelectItem>
                        <SelectItem value="DEMOTE_ADMIN">Demote Admin</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" className="border-zinc-800" onClick={fetchLogs}>Refresh</Button>
            </div>

            <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-zinc-950/80">
                        <TableRow className="hover:bg-transparent border-zinc-800">
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider py-4">Timestamp</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Administrator</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Action Executed</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Target Entity</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Trace Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-zinc-500 italic">Aggregating audit trace...</TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-zinc-700">No administrative actions recorded.</TableCell>
                            </TableRow>
                        ) : filtered.map((log) => (
                            <TableRow key={log.id} className="hover:bg-red-500/[0.02] border-zinc-800/50 transition-colors">
                                <TableCell className="text-[10px] font-mono text-zinc-500">
                                    {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <Shield size={10} className="text-amber-500" />
                                        </div>
                                        <span className="text-sm font-bold text-white">{log.admin?.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`${actionColors[log.action_type] || 'text-zinc-400 bg-zinc-800'} border py-0.5 px-2 text-[10px]`}>
                                        {log.action_type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <User size={12} className="text-zinc-600" />
                                        <span className="text-zinc-400 text-xs">{log.target?.email || 'N/A'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono italic">
                                        <Info size={10} />
                                        {Object.entries(log.metadata || {}).map(([k, v]) => `${k}: ${v}`).join(", ").slice(0, 40)}...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
