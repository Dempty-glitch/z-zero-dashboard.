'use client';

import { useState, useEffect } from "react";
import {
    Users,
    ShieldCheck,
    ShieldAlert,
    Ban,
    Unlock as UnlockIcon,
    Lock as LockIcon,
    MoreVertical,
    Search,
    Shield,
    Trash2,
    Calendar,
    Wallet
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isSuperMod, setIsSuperMod] = useState(false);

    useEffect(() => {
        fetchUsers();
        checkRoles();
    }, []);

    const checkRoles = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('users').select('is_supermod').eq('id', user.id).single();
            if (data?.is_supermod) setIsSuperMod(true);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, 
                    email, 
                    is_admin, 
                    is_supermod, 
                    status, 
                    created_at,
                    wallets (balance)
                `)
                .order('created_at', { ascending: false });

            if (data) setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId: string, newStatus: string) => {
        const { data: { user: admin } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);

        if (error) {
            toast.error("Failed to update status");
        } else {
            // Log action
            await supabase.from('admin_audit_logs').insert({
                admin_id: admin?.id,
                target_user_id: userId,
                action_type: newStatus === 'BANNED' ? 'BAN_USER' : 'LOCK_USER',
                metadata: { new_status: newStatus }
            });

            toast.success(`User marked as ${newStatus}`);
            fetchUsers();
        }
    };

    const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
        if (!isSuperMod) {
            toast.error("Access denied: Only SuperMods can manage Admin roles.");
            return;
        }

        const { data: { user: admin } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('users')
            .update({ is_admin: !currentAdmin })
            .eq('id', userId);

        if (error) {
            toast.error("Administrative update failed");
        } else {
            // Log action
            await supabase.from('admin_audit_logs').insert({
                admin_id: admin?.id,
                target_user_id: userId,
                action_type: !currentAdmin ? 'PROMOTE_ADMIN' : 'DEMOTE_ADMIN',
                metadata: { is_admin_now: !currentAdmin }
            });

            toast.success(`Access level updated`);
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="text-amber-500" /> Human Entity Management
                    </h1>
                    <p className="text-zinc-500">Govern user access levels and system status.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <Input
                        placeholder="Search by email..."
                        className="pl-10 bg-black/40 border-zinc-800 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="border-zinc-800" onClick={fetchUsers}>Refresh</Button>
            </div>

            <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-900/50">
                        <TableRow className="hover:bg-transparent border-zinc-800">
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Entity (Email)</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Access Tier</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Internal Balance</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Joined</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-zinc-500 italic">Decrypting registry...</TableCell>
                            </TableRow>
                        ) : filteredUsers.map((user) => (
                            <TableRow key={user.id} className="hover:bg-zinc-900/40 border-zinc-800 transition-colors">
                                <TableCell className="font-medium text-white">{user.email}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        {user.is_supermod && <Badge className="bg-amber-500 text-black font-black">SUPERMOD</Badge>}
                                        {user.is_admin ? (
                                            <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">Admin</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-zinc-500 border-zinc-800">Standard</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-white font-mono">
                                        <Wallet size={14} className="text-zinc-600" />
                                        ${Number(user.wallets?.[0]?.balance || 0).toFixed(2)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={
                                        user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            user.status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                    }>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-zinc-500 text-xs">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-800">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300">
                                            <DropdownMenuLabel>Account Commands</DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-zinc-800" />

                                            {!user.is_supermod && (
                                                <>
                                                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleAdmin(user.id, user.is_admin)}>
                                                        <Shield className="mr-2 h-4 w-4" />
                                                        {user.is_admin ? "Demote to Standard" : "Promote to Admin"}
                                                    </DropdownMenuItem>

                                                    {user.status === 'ACTIVE' ? (
                                                        <DropdownMenuItem className="text-amber-500 cursor-pointer" onClick={() => handleUpdateStatus(user.id, 'SUSPENDED')}>
                                                            <LockIcon className="mr-2 h-4 w-4" /> Suspend Access
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem className="text-emerald-500 cursor-pointer" onClick={() => handleUpdateStatus(user.id, 'ACTIVE')}>
                                                            <UnlockIcon className="mr-2 h-4 w-4" /> Restore Access
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem className="text-red-500 cursor-pointer" onClick={() => handleUpdateStatus(user.id, 'BANNED')}>
                                                        <Ban className="mr-2 h-4 w-4" /> Permanently Ban
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {user.is_supermod && (
                                                <DropdownMenuItem disabled className="text-zinc-600">
                                                    Immutable Entity
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
