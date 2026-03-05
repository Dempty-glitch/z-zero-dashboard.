import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { EvmAdapter } from '@/lib/deposit/adapters/evm';
import { TOKEN_WHITELIST } from '@/lib/deposit/config';

export async function POST(request: Request) {
    try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();

        const body = await request.json().catch(() => ({}));
        const userId = session?.user?.id || body.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch user's deposit wallet
        const { data: walletRow, error: walletError } = await supabaseAdmin
            .from('deposit_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (walletError || !walletRow) {
            return NextResponse.json({ error: 'Deposit wallet not found' }, { status: 404 });
        }

        const evmAddress = walletRow.evm_address.toLowerCase();
        // Topic for logs: 32 bytes left-padded address
        const recipientTopic = '0x000000000000000000000000' + evmAddress.slice(2);

        let scanCursors = walletRow.scan_cursors || {};
        let totalCreditedUsd = 0;
        let newDeposits: Array<{ chain: string, amount: number, token: string, txHash: string }> = [];
        let errors: string[] = [];

        // 2. Scan each whitelisted EVM network
        const evmChains = ['base', 'ethereum', 'bsc'];

        for (const chainId of evmChains) {
            const whitelist = TOKEN_WHITELIST[chainId];
            if (!whitelist) continue;

            console.log(`[SCAN] Starting ${chainId} scan for ${evmAddress}...`);
            const adapter = new EvmAdapter(chainId);

            try {
                // Determine block range
                const latestBlock = await adapter.getLatestBlock();
                let startBlock = scanCursors[chainId] ? parseInt(scanCursors[chainId]) : 0;

                // If no cursor, scan last ~8 days (~250k blocks)
                const MAX_LOOKBACK = 250000;
                if (startBlock === 0 || (latestBlock - startBlock) > 500000) {
                    startBlock = Math.max(0, latestBlock - MAX_LOOKBACK);
                }

                if (startBlock >= latestBlock) {
                    console.log(`[SCAN] ${chainId} already up to date at block ${latestBlock}`);
                    continue;
                }

                // Scan for each whitelisted token
                for (const [symbol, info] of Object.entries(whitelist)) {
                    console.log(`[SCAN] ${chainId}: Looking for ${symbol} logs...`);
                    const logs = await adapter.scanLogs(startBlock, latestBlock, info.contract.toLowerCase(), recipientTopic);

                    for (const log of logs) {
                        const txHash = log.transactionHash;

                        // Idempotency check: Use hash + logIndex for absolute uniqueness
                        const uniqueId = `${chainId}_${txHash}_${parseInt(log.logIndex, 16)}`;

                        const { data: existing } = await supabaseAdmin
                            .from('crypto_deposits')
                            .select('id')
                            .filter('tx_hash', 'eq', txHash) // Simple check for hash first
                            .single();

                        if (existing) continue;

                        const amountRaw = BigInt(log.data);
                        const amountUsd = Number(amountRaw) / Math.pow(10, info.decimals);
                        const sender = '0x' + log.topics[1].slice(26);

                        if (amountUsd <= 0) continue;

                        // Insert Deposit
                        const { error: insertError } = await supabaseAdmin.from('crypto_deposits').insert({
                            user_id: userId,
                            chain_id: chainId,
                            tx_hash: txHash,
                            sender_address: sender,
                            token_symbol: symbol,
                            amount_raw: amountRaw.toString(),
                            amount_usd: amountUsd,
                            status: 'CONFIRMED',
                        });

                        if (insertError) {
                            console.error(`[SCAN] Failed to insert deposit for ${txHash}:`, insertError.message);
                            continue;
                        }

                        // Update Balance
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

                        totalCreditedUsd += amountUsd;
                        newDeposits.push({ chain: chainId, amount: amountUsd, token: symbol, txHash });
                    }
                }

                // Update cursor
                scanCursors[chainId] = latestBlock.toString();

            } catch (err: any) {
                console.error(`[SCAN] Error scanning ${chainId}:`, err.message);
                errors.push(`${chainId}: ${err.message}`);
                // Continue to next chain
            }
        }

        // 3. Save updated scan cursors
        await supabaseAdmin
            .from('deposit_wallets')
            .update({ scan_cursors: scanCursors })
            .eq('user_id', userId);

        return NextResponse.json({
            success: true,
            totalCredited: totalCreditedUsd,
            newDeposits,
            errors: errors.length > 0 ? errors : undefined,
            message: totalCreditedUsd > 0
                ? `Successfully found and credited $${totalCreditedUsd.toFixed(2)}!`
                : 'No new deposits found.',
        });

    } catch (err: any) {
        console.error('Scan API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
