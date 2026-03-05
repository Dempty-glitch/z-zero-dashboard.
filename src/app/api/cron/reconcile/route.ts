import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { EvmAdapter } from '@/lib/deposit/adapters/evm';
import { TOKEN_WHITELIST } from '@/lib/deposit/config';

export const maxDuration = 300; // 5 minutes for cron

export async function GET(request: Request) {
    if (process.env.CRON_SECRET && request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        console.log('[CRON] Starting optimized smart reconciliation...');
        const { data: wallets } = await supabaseAdmin.from('deposit_wallets').select('*');
        if (!wallets) return NextResponse.json({ success: true, processed: 0 });

        let totalCreditedAcrossAll = 0;
        const evmChains = ['base', 'ethereum', 'bsc'];

        for (const walletRow of wallets) {
            const userId = walletRow.user_id;
            const evmAddress = walletRow.evm_address.toLowerCase();
            const recipientTopic = '0x000000000000000000000000' + evmAddress.slice(2);

            let scanCursors = walletRow.scan_cursors || {};
            let intentBlocks = walletRow.intent_blocks || {};

            for (const chainId of evmChains) {
                const adapter = new EvmAdapter(chainId);
                const whitelist = TOKEN_WHITELIST[chainId];

                try {
                    const latestBlock = await adapter.getLatestBlock();

                    // [PA-1] SMART SCAN LOGIC:
                    // 1. If user has an active "Intent" (clicked deposit recently)
                    // 2. We scan from Intent - 100 blocks to Latest
                    // 3. Otherwise, use the last saved cursor or fallback to -1000 blocks (instead of -50000)

                    const intentBlock = intentBlocks[chainId];
                    const intentTime = intentBlocks[`${chainId}_at`];
                    const isRecentIntent = intentTime && (new Date().getTime() - new Date(intentTime).getTime()) < 2 * 60 * 60 * 1000; // 2 hours

                    let startBlock: number;
                    if (isRecentIntent && intentBlock) {
                        startBlock = Math.max(0, intentBlock - 100);
                        console.log(`[CRON] FAST SCAN for user ${userId} on ${chainId} from block ${startBlock}`);
                    } else {
                        // Standard cursor sync (much smaller window to avoid rate limits)
                        startBlock = scanCursors[chainId] ? parseInt(scanCursors[chainId]) : (latestBlock - 1000);
                    }

                    if (startBlock >= latestBlock) continue;

                    // Limit scan range to 1000 blocks per run to prevent RPC "limit exceeded" errors
                    const safeToBlock = Math.min(latestBlock, startBlock + 1000);

                    for (const [symbol, info] of Object.entries(whitelist)) {
                        const logs = await adapter.scanLogs(startBlock, safeToBlock, info.contract.toLowerCase(), recipientTopic);

                        for (const log of logs) {
                            const txHash = log.transactionHash;
                            const uniqueDepositId = `${chainId}_${txHash}_tokentx`;

                            const { data: existing } = await supabaseAdmin
                                .from('crypto_deposits')
                                .select('id')
                                .eq('tx_hash', uniqueDepositId)
                                .single();

                            if (existing) continue;

                            const amountRaw = BigInt(log.data);
                            const amountUsd = Number(amountRaw) / Math.pow(10, info.decimals);

                            // Record Deposit
                            await supabaseAdmin.from('crypto_deposits').insert({
                                user_id: userId,
                                chain_id: chainId,
                                tx_hash: uniqueDepositId,
                                sender_address: '0x' + log.topics[1].slice(26),
                                token_symbol: symbol,
                                amount_raw: amountRaw.toString(),
                                amount_usd: amountUsd,
                                status: 'CONFIRMED',
                            });

                            // Update Balance
                            const { data: userWallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', userId).single();
                            if (userWallet) {
                                await supabaseAdmin.from('wallets').update({ balance: Number(userWallet.balance) + amountUsd }).eq('user_id', userId);
                            }
                            totalCreditedAcrossAll += amountUsd;
                        }
                    }
                    scanCursors[chainId] = safeToBlock.toString();
                } catch (e: any) {
                    console.error(`[CRON] Throttled Error for user ${userId} on ${chainId}:`, e.message);
                }
            }
            await supabaseAdmin.from('deposit_wallets').update({ scan_cursors: scanCursors }).eq('user_id', userId);
        }

        return NextResponse.json({ success: true, totalCredited: totalCreditedAcrossAll });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
