import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AgentDocsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 sm:p-12 font-mono">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Terminal className="text-cyan-400 h-8 w-8" />
                            Agent Gateway Setup
                        </h1>
                        <p className="text-muted-foreground mt-2 font-sans">
                            Instructions for AI Agents (and their Developers) to connect to Z-ZERO.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="border-zinc-700">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                        </Link>
                    </Button>
                </div>

                {/* Step 1 */}
                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Step 1: Install the Z-ZERO MCP Server
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-400 mb-4 font-sans">
                            Z-ZERO uses the Model Context Protocol (MCP) to expose secure payment tools to AI models like Claude, AutoGPT, and CrewAI. Install globally with:
                        </p>
                        <div className="bg-black/80 rounded-md p-4 relative group border border-zinc-800">
                            <code className="text-cyan-300">npm install -g z-zero-mcp-server</code>
                        </div>
                        <p className="text-xs text-zinc-600 mt-2 font-sans">
                            Package: <a href="https://www.npmjs.com/package/z-zero-mcp-server" target="_blank" className="text-cyan-500 hover:underline">npmjs.com/package/z-zero-mcp-server</a>
                        </p>
                    </CardContent>
                </Card>

                {/* Step 2 */}
                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Step 2: Configure Your Agent
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-400 mb-4 font-sans">
                            Your human operator must generate a <code className="text-emerald-400">Z_ZERO_API_KEY</code> from the{" "}
                            <Link href="/login" className="text-emerald-400 hover:underline">Human Dashboard</Link>.
                            Add this to your MCP config file (e.g., <code className="text-zinc-300">~/.cursor/mcp.json</code> or Claude Desktop config):
                        </p>
                        <div className="bg-black/80 rounded-md p-4 border border-zinc-800 text-sm overflow-x-auto">
                            <pre className="text-zinc-300"><code>{`{
  "mcpServers": {
    "z-zero-payments": {
      "command": "npx",
      "args": ["-y", "z-zero-mcp-server"],
      "env": {
        "Z_ZERO_API_KEY": "zk_live_...",
        "Z_ZERO_SUPABASE_URL": "https://ykuqswzaymrronjzhvip.supabase.co",
        "Z_ZERO_SUPABASE_ANON_KEY": "eyJhbG..."
      }
    }
  }
}`}</code></pre>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 3 */}
                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Step 3: Execute JIT Payments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-400 mb-4 font-sans">
                            You now have access to 4 secure payment tools. When you need to purchase something, use the following flow:
                        </p>

                        <div className="space-y-3">
                            <div className="bg-black/80 rounded-md p-4 border border-zinc-700 text-sm">
                                <p className="text-zinc-500 text-xs mb-2">1. Check your balance first:</p>
                                <pre className="text-zinc-300"><code>{`// Tool: list_cards
// Returns your card alias and current balance`}</code></pre>
                            </div>

                            <div className="bg-black/80 rounded-md p-4 border border-zinc-700 text-sm">
                                <p className="text-zinc-500 text-xs mb-2">2. Request a payment token (15-min TTL):</p>
                                <pre className="text-zinc-300"><code>{`// Tool: request_payment_token
{
  "card_alias": "MyAgent",
  "amount": 15.00,
  "merchant": "Anthropic API"
}`}</code></pre>
                            </div>

                            <div className="bg-black/80 rounded-md p-4 border border-zinc-700 text-sm">
                                <p className="text-zinc-500 text-xs mb-2">3. Execute payment on checkout page:</p>
                                <pre className="text-zinc-300"><code>{`// Tool: execute_payment
{
  "token": "temp_auth_...",
  "checkout_url": "https://merchant.com/checkout"
}`}</code></pre>
                            </div>
                        </div>

                        <p className="text-sm text-red-400 mt-4 font-sans border-l-2 border-red-500 pl-3">
                            🔐 Security: You will NEVER see the actual card number. The JIT token is injected directly into the checkout form by the MCP Bridge and burned after one use.
                        </p>
                    </CardContent>
                </Card>

                {/* Available Tools */}
                <Card className="bg-zinc-900/40 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-300">Available MCP Tools</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                            {["list_cards", "check_balance", "request_payment_token", "execute_payment"].map(tool => (
                                <div key={tool} className="bg-black/40 border border-zinc-800 rounded px-3 py-2 text-emerald-400">
                                    {tool}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
