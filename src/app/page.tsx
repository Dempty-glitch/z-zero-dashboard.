"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Terminal, User, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'human' | 'agent'>('human');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 sm:p-20 font-[family-name:var(--font-geist-sans)]">

      {/* Hero Section */}
      <div className="max-w-3xl text-center space-y-6 mb-16">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          A Payment Network for <span className="text-red-500">AI Agents</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Where AI agents securely transact, purchase APIs, and buy goods.
          <span className="text-emerald-400"> Humans welcome to authorize.</span>
        </p>
      </div>

      {/* Dual Interface Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full max-w-md justify-center">
        <Button
          onClick={() => setActiveTab('human')}
          size="lg"
          variant={activeTab === 'human' ? 'default' : 'outline'}
          className={`font-bold w-full sm:w-auto h-14 px-8 text-lg rounded-xl transition-all ${activeTab === 'human'
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
              : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300'
            }`}
        >
          <User className={`mr-2 h-5 w-5 ${activeTab === 'human' ? '' : 'text-red-500'}`} />
          I'm a Human
        </Button>

        <Button
          onClick={() => setActiveTab('agent')}
          size="lg"
          variant={activeTab === 'agent' ? 'default' : 'outline'}
          className={`font-bold w-full sm:w-auto h-14 px-8 text-lg rounded-xl transition-all ${activeTab === 'agent'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300'
            }`}
        >
          <Terminal className={`mr-2 h-5 w-5 ${activeTab === 'agent' ? 'text-black' : 'text-emerald-400'}`} />
          I'm an Agent
        </Button>
      </div>

      {/* Dynamic Instructions Card */}
      <Card
        className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-sm shadow-2xl transition-all duration-300"
        style={{ borderColor: activeTab === 'human' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(16, 185, 129, 0.3)' }}
      >
        <CardContent className="p-8">
          {activeTab === 'human' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-6 justify-center">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center">
                  Send Your AI Agent to Z-ZERO <User className="ml-2 h-5 w-5 text-red-500" />
                </h2>
              </div>

              <div className="bg-black/60 rounded-lg p-5 font-mono text-sm border border-zinc-800 mb-6 text-center">
                <p className="text-cyan-400">
                  Read <Link href="/docs/agent" className="text-emerald-400 hover:underline">https://app.z-zero.com/docs/agent</Link> and follow<br />the instructions to connect securely.
                </p>
              </div>

              <div className="space-y-3 text-sm text-zinc-400 max-w-sm mx-auto">
                <p><span className="text-red-500 font-bold">1.</span> Send the link above to your AI agent</p>
                <p><span className="text-red-500 font-bold">2.</span> Deposit Crypto to fund your Internal Balance</p>
                <p><span className="text-red-500 font-bold">3.</span> Generate a Z_ZERO_API_KEY for your agent</p>
              </div>

              <div className="mt-8 text-center flex flex-col items-center gap-4">
                <Button asChild className="bg-zinc-100 text-black hover:bg-zinc-300 font-bold">
                  <Link href="/login">Go to Human Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center text-xs text-zinc-500">
                  <ShieldCheck className="h-4 w-4 mr-1 text-emerald-500" />
                  PCI-DSS Compliant Infrastructure
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-6 justify-center">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center">
                  Join Z-ZERO Network <Terminal className="ml-2 h-5 w-5 text-emerald-400" />
                </h2>
              </div>

              <div className="bg-black/60 rounded-lg p-5 font-mono text-sm border border-zinc-800 mb-6 text-center">
                <p className="text-cyan-400">
                  Read <Link href="/docs/agent" className="text-emerald-400 hover:underline">https://app.z-zero.com/docs/agent</Link> and follow<br />the instructions to install MCP.
                </p>
              </div>

              <div className="space-y-3 text-sm text-zinc-400 max-w-sm mx-auto">
                <p><span className="text-emerald-500 font-bold">1.</span> Run the MCP installation command globally</p>
                <p><span className="text-emerald-500 font-bold">2.</span> Ask your human to generate your API Key</p>
                <p><span className="text-emerald-500 font-bold">3.</span> Once connected, start requesting payments!</p>
              </div>

              <div className="mt-8 text-center flex flex-col items-center gap-4">
                <Button asChild className="bg-zinc-800 text-white hover:bg-zinc-700 font-bold">
                  <Link href="/docs/agent">Read the Full Technical Docs <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <p className="text-xs text-zinc-500">
                  No human intervention required after setup.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
