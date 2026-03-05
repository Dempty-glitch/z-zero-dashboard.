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
        console.log('[CRON] Starting daily reconciliation...');
        const { data: wallets } = await supabaseAdmin.from('deposit_wallets').select('*');
        if (!wallets) return NextResponse.json({ success: true, processed: 0 });

        let totalCreditedAcrossAll = 0;
        const evmChains = ['base', 'ethereum', 'bsc'];

        for (const walletRow of wallets) {
            const userId = walletRow.user_id;
            const evmAddress = walletRow.evm_address.toLowerCase();
            const recipientTopic = '0x000000000000000000000000' + evmAddress.slice(2);
            let scanCursors = walletRow.scan_cursors || {};

            for (const chainId of evmChains) {
                const adapter = new EvmAdapter(chainId);
                const whitelist = TOKEN_WHITELIST[chainId];

                try {
                    const latestBlock = await adapter.getLatestBlock();
                    let startBlock = scanCursors[chainId] ? parseInt(scanCursors[chainId]) : (latestBlock - 50000);

                    if (startBlock >= latestBlock) continue;

                    for (const [symbol, info] of Object.entries(whitelist)) {
                        const logs = await adapter.scanLogs(startBlock, latestBlock, info.contract.toLowerCase(), recipientTopic);

                        for (const log of logs) {
                            const txHash = log.transactionHash;
                            const { data: existing } = await supabaseAdmin
                                .from('crypto_deposits')
                                .select('id')
                                .eq('tx_hash', txHash)
                                .single();

                            if (existing) continue;

                            const amountRaw = BigInt(log.data);
                            const amountUsd = Number(amountRaw) / Math.pow(10, info.decimals);

                            // Insert & Update Balance (simulated logic here, same as scan route)
                            await supabaseAdmin.from('crypto_deposits').insert({
                                user_id: userId,
                                chain_id: chainId,
                                tx_hash: txHash,
                                sender_address: '0x' + log.topics[1].slice(26),
                                token_symbol: symbol,
                                amount_raw: amountRaw.toString(),
                                amount_usd: amountUsd,
                                status: 'CONFIRMED',
                            });

                            const { data: userWallet } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', userId).single();
                            if (userWallet) {
                                await supabaseAdmin.from('wallets').update({ balance: Number(userWallet.balance) + amountUsd }).eq('user_id', userId);
                            }

                            totalCreditedAcrossAll += amountUsd;
                        }
                    }
                    scanCursors[chainId] = latestBlock.toString();
                } catch (e: any) {
                    console.error(`[CRON] Error for user ${userId} on ${chainId}:`, e.message);
                }
            }

            await supabaseAdmin.from('deposit_wallets').update({ scan_cursors: scanCursors }).eq('user_id', userId);
        }

        return NextResponse.json({ success: true, totalCredited: totalCreditedAcrossAll });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
