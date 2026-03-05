import { Terminal, ShieldCheck, Zap } from "lucide-react";

export default function SOPPage() {
    return (
        <div className="min-h-screen bg-black text-zinc-300 p-8 font-mono text-sm leading-relaxed max-w-3xl mx-auto selection:bg-emerald-500 selection:text-black">
            <div className="mb-12 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <ShieldCheck size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tighter">Z-ZERO: Autonomous Payment SOP</h1>
                </div>
                <div className="flex gap-4 text-[10px] uppercase tracking-widest text-zinc-500">
                    <span className="flex items-center gap-1"><Zap size={10} className="text-emerald-500" /> Version 1.0.0</span>
                    <span className="flex items-center gap-1"><Terminal size={10} /> Zero-Trust Protocol</span>
                </div>
            </div>

            <section className="space-y-8">
                <div>
                    <h2 className="text-white font-bold mb-4 uppercase tracking-widest text-xs border-l-2 border-emerald-500 pl-3">01. Overview</h2>
                    <p>
                        This Standard Operating Procedure (SOP) defines the protocol for AI Agents to execute secure, zero-trust payments.
                        Agents must never handle raw PII (Card Numbers, CVV). All transactions are executed via temporary JIT tokens.
                    </p>
                </div>

                <div>
                    <h2 className="text-white font-bold mb-4 uppercase tracking-widest text-xs border-l-2 border-emerald-500 pl-3">02. Execution Workflow</h2>
                    <div className="space-y-4">
                        <div className="group">
                            <h3 className="text-emerald-400 font-bold mb-1">[STEP_1] VERIFY_INTENT</h3>
                            <p>Confirm item price in USD. Call `check_balance` to ensure collateral exists in Z-ZERO Internal Balance.</p>
                        </div>
                        <div className="group">
                            <h3 className="text-emerald-400 font-bold mb-1">[STEP_2] REQUEST_TOKEN</h3>
                            <p>Call `request_payment_token` with exact amount and merchant name. Receive `temp_auth_...` token (TTL: 15m).</p>
                        </div>
                        <div className="group">
                            <h3 className="text-emerald-400 font-bold mb-1">[STEP_3] LOCATE_CHECKOUT</h3>
                            <p>Identify target URL containing the payment form (e.g., Stripe, Shopify checkout).</p>
                        </div>
                        <div className="group">
                            <h3 className="text-emerald-400 font-bold mb-1">[STEP_4] BLIND_EXECUTE</h3>
                            <p>Call `execute_payment` with token + URL. The MCP bridge will inject card data and confirm purchase.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-white font-bold mb-4 uppercase tracking-widest text-xs border-l-2 border-emerald-500 pl-3">03. Security Constraints</h2>
                    <ul className="list-disc list-inside space-y-2 text-zinc-400">
                        <li>NEVER print full tokens in human-visible chat logs.</li>
                        <li>FAIL_SAFE: If injection fails, provide error log to human. Do not loop.</li>
                        <li>NO_MANUAL_ENTRY: Refuse if merchant asks for card data via text input.</li>
                    </ul>
                </div>
            </section>

            <div className="mt-16 pt-8 border-t border-zinc-900 text-[10px] text-zinc-600 flex justify-between">
                <span>SYSTEM_AUTH: VERIFIED_AGENT_ONLY</span>
                <span>GITHUB.COM/DEMPTY-GLITCH/AI-CARD-MCP</span>
            </div>
        </div>
    );
}
