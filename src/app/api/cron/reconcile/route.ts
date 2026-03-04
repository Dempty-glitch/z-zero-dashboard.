import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { TOKEN_WHITELIST } from '@/lib/deposit/config';

export const maxDuration = 60; // Max allowed for Vercel Hobby/Pro cron if possible

const EXPLORER_APIS: Record<string, { url: string; key: string | undefined }> = {
    base: { url: 'https://api.basescan.org/api', key: process.env.BASESCAN_API_KEY },
    ethereum: { url: 'https://api.etherscan.io/api', key: process.env.ETHERSCAN_API_KEY },
    bsc: { url: 'https://api.bscscan.com/api', key: process.env.BSCSCAN_API_KEY },
};

export async function GET(request: Request) {
    // Vercel Cron Authentication
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        // Return 401 if unauthorized, but for ease of testing in dev we might allow it.
        // Let's enforce it but return a friendly message.
        if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
            console.warn('CRON_SECRET is not set in production. Cron is open to public.');
        } else if (process.env.CRON_SECRET && request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    try {
        console.log('[CRON_RECONCILE] Starting Daily Deposit Reconciliation...');

        // 1. Fetch all active deposit wallets
        const { data: wallets, error: wError } = await supabaseAdmin
            .from('deposit_wallets')
            .select('*');

        if (wError || !wallets) {
            console.error('[CRON_RECONCILE] Failed to fetch wallets:', wError);
            return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
        }

        let totalCreditedAcrossAll = 0;
        let usersProcessed = 0;

        // 2. Process each user sequentially to avoid overwhelming Explorer APIs
        for (const walletRow of wallets) {
            const userId = walletRow.user_id;
            const evmAddress = walletRow.evm_address.toLowerCase();
            let scanCursors = walletRow.scan_cursors || {};
            let userTotalUsd = 0;

            const evmChains = ['base', 'ethereum', 'bsc'];

            for (const chainId of evmChains) {
                const apiConfig = EXPLORER_APIS[chainId];
                const whitelist = TOKEN_WHITELIST[chainId];
                if (!apiConfig || !whitelist) continue;

                if (!apiConfig.key) {
                    console.error(`[CRON_RECONCILE] Missing API Key for ${chainId.toUpperCase()}Scan. Skipping.`);
                    continue;
                }

                try {
                    let startBlock = scanCursors[chainId] ? parseInt(scanCursors[chainId]) : 0;
                    const fetchUrl = `${apiConfig.url}?module=account&action=tokentx&address=${evmAddress}&startblock=${startBlock}&endblock=999999999&sort=asc&apikey=${apiConfig.key}`;

                    const res = await fetch(fetchUrl);
                    const data = await res.json();

                    if (data.status !== '1' && data.message !== 'No transactions found') {
                        throw new Error(data.result || data.message || 'Unknown API Error');
                    }

                    const transfers: any[] = data.result || [];
                    let highestBlockScanned = startBlock;

                    for (const tx of transfers) {
                        const blockNumber = parseInt(tx.blockNumber);
                        if (blockNumber > highestBlockScanned) highestBlockScanned = blockNumber;

                        if (tx.to.toLowerCase() !== evmAddress) continue;

                        const tokenAddress = tx.contractAddress.toLowerCase();
                        const txHash = tx.hash;

                        let matchedSymbol = '';
                        let matchedDecimals = 6;

                        const whitelistEntries = Object.entries(whitelist) as [string, { contract: string, decimals: number }][];
                        for (const [sym, info] of whitelistEntries) {
                            if (info.contract.toLowerCase() === tokenAddress) {
                                matchedSymbol = sym;
                                matchedDecimals = info.decimals;
                                break;
                            }
                        }

                        if (!matchedSymbol) continue;

                        const amountUsd = Number(tx.value) / Math.pow(10, matchedDecimals);
                        if (amountUsd <= 0) continue;

                        const uniqueDepositId = `${chainId}_${txHash}_tokentx`;

                        const { data: existing } = await supabaseAdmin
                            .from('crypto_deposits')
                            .select('id')
                            .eq('tx_hash', uniqueDepositId)
                            .single();

                        if (existing) continue;

                        await supabaseAdmin.from('crypto_deposits').insert({
                            user_id: userId,
                            chain_id: chainId,
                            tx_hash: uniqueDepositId,
                            sender_address: tx.from,
                            token_symbol: matchedSymbol,
                            amount_raw: tx.value,
                            amount_usd: amountUsd,
                            status: 'CONFIRMED',
                        });

                        const { data: userWallet } = await supabaseAdmin
                            .from('wallets')
                            .select('balance')
                            .eq('user_id', userId)
                            .single();

                        if (userWallet) {
                            await supabaseAdmin
                                .from('wallets')
                                .update({ balance: Number(userWallet.balance) + amountUsd })
                                .eq('user_id', userId);
                        } else {
                            await supabaseAdmin.from('wallets').insert({
                                user_id: userId,
                                balance: amountUsd,
                            });
                        }

                        userTotalUsd += amountUsd;
                        totalCreditedAcrossAll += amountUsd;
                    }

                    // Delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 250));
                    scanCursors[chainId] = highestBlockScanned.toString();

                } catch (err) {
                    console.error(`[CRON_RECONCILE] Error scanning ${chainId} for user ${userId}:`, err);
                }
            }

            // Save updated cursors for this user
            await supabaseAdmin
                .from('deposit_wallets')
                .update({ scan_cursors: scanCursors })
                .eq('user_id', userId);

            usersProcessed++;
        }

        console.log(`[CRON_RECONCILE] Completed. Processed ${usersProcessed} users. Auto-credited: $${totalCreditedAcrossAll}`);
        return NextResponse.json({ success: true, processed: usersProcessed, totalCredited: totalCreditedAcrossAll });

    } catch (error: any) {
        console.error('[CRON_RECONCILE] Fatal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
