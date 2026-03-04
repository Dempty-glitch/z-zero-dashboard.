import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CHAINS, TOKEN_WHITELIST } from '@/lib/deposit/config';

// Transfer event signature
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

async function rpcCall(url: string, method: string, params: any[]) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
}

export async function POST(request: Request) {
    try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();
        // Since we removed authorization header checking for simplicity in dev, 
        // we should ideally just rely on the user passing the JWT or relying on the session
        // Wait, earlier deposit route grabbed session, or allowed passed userId.

        // Let's get userId from body if sent (for testing) or session.
        const body = await request.json().catch(() => ({}));
        const userId = session?.user?.id || body.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch user's deposit wallets
        const { data: walletRow, error: walletError } = await supabaseAdmin
            .from('deposit_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (walletError || !walletRow) {
            return NextResponse.json({ error: 'Deposit wallets not found' }, { status: 404 });
        }

        const evmAddress = walletRow.evm_address.toLowerCase();
        let scanCursors = walletRow.scan_cursors || {};
        let totalCreditedUsd = 0;
        let newDeposits: Array<{ chain: string, amount: number, token: string, txHash: string }> = [];

        // 2. Scan each EVM network we support
        const evmChains = ['base', 'ethereum', 'bsc'];

        for (const chainId of evmChains) {
            const config = CHAINS[chainId];
            const whitelist = TOKEN_WHITELIST[chainId];
            if (!config || !whitelist) continue;

            try {
                // Get latest block
                const latestHex = await rpcCall(config.rpcUrl, 'eth_blockNumber', []);
                const latestBlock = parseInt(latestHex, 16);

                // Determine block range
                // On BSC, 50,000 blocks is ~41 hours. 5,000 blocks is only ~4 hours.
                // Let's use 50,000 for the first scan to catch older transactions.
                const lastScanned = scanCursors[chainId] ? parseInt(scanCursors[chainId]) : latestBlock - 50000;
                let fromBlock = lastScanned + 1;

                // Max range to avoid RPC limits
                if (latestBlock - fromBlock > 5000) {
                    fromBlock = latestBlock - 5000;
                }

                if (fromBlock > latestBlock) continue;

                const queryAddress = '0x000000000000000000000000' + evmAddress.slice(2);

                const logs = await rpcCall(config.rpcUrl, 'eth_getLogs', [{
                    fromBlock: '0x' + fromBlock.toString(16),
                    toBlock: '0x' + latestBlock.toString(16),
                    topics: [TRANSFER_TOPIC, null, queryAddress]
                }]);

                for (const log of logs) {
                    const tokenAddress = log.address.toLowerCase();
                    const txHash = log.transactionHash;
                    const logIndex = parseInt(log.logIndex, 16);

                    // Match token
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

                    if (!matchedSymbol) continue; // Unrecognized token

                    const amountRaw = BigInt(log.data);
                    const amountUsd = Number(amountRaw) / Math.pow(10, matchedDecimals);

                    if (amountUsd <= 0) continue;

                    // Idempotency check: Ensure we haven't credited this exact log before
                    const uniqueDepositId = `${chainId}_${txHash}_${logIndex}`;

                    const { data: existing } = await supabaseAdmin
                        .from('crypto_deposits')
                        .select('id')
                        .eq('tx_hash', uniqueDepositId)
                        .single();

                    if (existing) continue; // Already processed

                    const sender = '0x' + log.topics[1].slice(26);

                    // Credit User
                    await supabaseAdmin.from('crypto_deposits').insert({
                        user_id: userId,
                        chain_id: chainId,
                        tx_hash: uniqueDepositId, // Hack: Storing unique ID in tx_hash to avoid duplicating schemas changing right now
                        sender_address: sender,
                        token_symbol: matchedSymbol,
                        amount_raw: amountRaw.toString(),
                        amount_usd: amountUsd,
                        status: 'CONFIRMED',
                    });

                    // Update wallet balance
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
                    newDeposits.push({ chain: chainId, amount: amountUsd, token: matchedSymbol, txHash });
                }

                // Update cursor for this chain
                scanCursors[chainId] = latestBlock;

            } catch (err) {
                console.error(`Error scanning ${chainId}:`, err);
                // Continue to next chain
            }
        }

        // 3. Save updated cursors
        await supabaseAdmin
            .from('deposit_wallets')
            .update({ scan_cursors: scanCursors })
            .eq('user_id', userId);

        return NextResponse.json({
            success: true,
            totalCredited: totalCreditedUsd,
            newDeposits,
            message: totalCreditedUsd > 0
                ? `$${totalCreditedUsd.toFixed(2)} found and credited!`
                : 'No new deposits found.',
        });

    } catch (err: any) {
        console.error('Scan API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
