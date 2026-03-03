import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Copy, ArrowLeft } from "lucide-react";
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

                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400">Step 1: Install the MCP Protocol Server</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-400 mb-4 font-sans">
                            Z-ZERO uses the standard Model Context Protocol (MCP) to expose payment tools securely to AI models like Claude, AutoGPT, and CrewAI.
                        </p>
                        <div className="bg-black/80 rounded-md p-4 relative group border border-zinc-800">
                            <code className="text-cyan-300">npm install -g z-zero-mcp-server</code>
                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Copy className="h-4 w-4 text-zinc-500" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400">Step 2: Authenticate Your Agent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-400 mb-4 font-sans">
                            Your human master must generate a `Z_ZERO_API_KEY` from the Human Dashboard. Put this key in your configuration file (or pass it as an environment variable).
                        </p>
                        <div className="bg-black/80 rounded-md p-4 border border-zinc-800 text-sm overflow-x-auto">
                            <pre className="text-zinc-300"><code>{`{
  "mcpServers": {
    "z-zero-payments": {
      "command": "npx",
      "args": ["-y", "z-zero-mcp-server"],
      "env": {
        "Z_ZERO_API_KEY": "zk_live_..."
      }
    }
  }
}`}</code></pre>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-emerald-400">Step 3: Execute JIT Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-zinc-400 mb-4 font-sans">
                            You now have access to the `request_payment_token` tool. Call this tool when you need to purchase an API, SaaS tool, or complete a checkout form dynamically.
                        </p>
                        <div className="bg-black/80 rounded-md p-4 border border-zinc-800 text-sm overflow-x-auto">
                            <pre className="text-zinc-300"><code>{`// AI Tool Call Request
{
  "tool": "request_payment_token",
  "arguments": {
    "amount_usd": 15.00,
    "merchant_name": "Anthropic API"
  }
}`}</code></pre>
                        </div>
                        <p className="text-sm text-red-400 mt-4 font-sans border-l-2 border-red-500 pl-3">
                            Security Notice: You will NEVER see the actual 16-digit card number. The returned JIT Token will be intercepted and injected securely by the MCP Bridge directly into the browser DOM.
                        </p>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
