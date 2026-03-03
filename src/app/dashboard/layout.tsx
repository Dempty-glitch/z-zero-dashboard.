import { Terminal, CreditCard, LayoutDashboard, Settings, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-6 hidden md:flex flex-col">
                <div className="flex items-center gap-2 mb-10 text-emerald-400 font-bold text-xl">
                    <Terminal className="h-6 w-6" /> Z-ZERO
                </div>

                <nav className="space-y-2 flex-1">
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/dashboard/agents"><Terminal className="mr-2 h-4 w-4" /> AI Agents (Keys)</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/dashboard/transactions"><CreditCard className="mr-2 h-4 w-4" /> Transactions</Link>
                    </Button>
                </nav>

                <div className="mt-auto border-t border-zinc-800 pt-6">
                    <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" asChild>
                        <Link href="/login"><User className="mr-2 h-4 w-4" /> 0xAdmin...e3f4</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-zinc-500 hover:text-white hover:bg-zinc-800 mt-2" asChild>
                        <Link href="/"><Settings className="mr-2 h-4 w-4" /> Log out</Link>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
                {/* Mobile Header */}
                <div className="md:hidden border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950/50">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Terminal className="h-5 w-5" /> Z-ZERO
                    </div>
                    <Button variant="outline" size="sm" className="border-zinc-700 bg-black text-xs">
                        0xAdmin...e3f4
                    </Button>
                </div>

                <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
