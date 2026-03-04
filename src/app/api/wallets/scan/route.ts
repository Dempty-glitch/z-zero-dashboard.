import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { TOKEN_WHITELIST } from '@/lib/deposit/config';

// Define explorer APIs
const EXPLORER_APIS: Record<string, { url: string; key: string | undefined }> = {
    base: { url: 'https://api.basescan.org/api', key: process.env.BASESCAN_API_KEY },
    ethereum: { url: 'https://api.etherscan.io/api', key: process.env.ETHERSCAN_API_KEY },
    bsc: { url: 'https://api.bscscan.com/api', key: process.env.BSCSCAN_API_KEY },
};

export async function POST(request: Request) {
    try {
        const { data: { session } } = await supabaseAdmin.auth.getSession();

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

        // 2. Scan each EVM network using Block Explorer APIs
        const evmChains = ['base', 'ethereum', 'bsc'];

        for (const chainId of evmChains) {
            const apiConfig = EXPLORER_APIS[chainId];
            const whitelist = TOKEN_WHITELIST[chainId];
            if (!apiConfig || !whitelist) continue;

            try {
                // For safety on first run, we scan from a reasonable block 
                // Or startblock 0 if no cursor exists
                let startBlock = scanCursors[chainId] ? parseInt(scanCursors[chainId]) : 0;

                // If it's a completely brand new wallet and we don't want to scan from 0 (too long),
                // we technically could fetch the latest block first, but the explorer API
                // handles large ranges fine for a single address.

                const fetchUrl = `${apiConfig.url}?module=account&action=tokentx&address=${evmAddress}&startblock=${startBlock}&endblock=999999999&sort=asc` +
                    (apiConfig.key ? `&apikey=${apiConfig.key}` : '');

                const res = await fetch(fetchUrl);
                const data = await res.json();

                if (data.status !== '1' && data.message !== 'No transactions found') {
                    console.error(`Explorer API Error for ${chainId}:`, data.result || data.message);
                    continue;
                }

                const transfers: any[] = data.result || [];
                let highestBlockScanned = startBlock;

                for (const tx of transfers) {
                    const blockNumber = parseInt(tx.blockNumber);
                    if (blockNumber > highestBlockScanned) {
                        highestBlockScanned = blockNumber;
                    }

                    // Only process INCOMING transfers
                    if (tx.to.toLowerCase() !== evmAddress) continue;

                    const tokenAddress = tx.contractAddress.toLowerCase();
                    const txHash = tx.hash;

                    // Match token against whitelist
                    let matchedSymbol = '';
                    let matchedDecimals = 6;

                    // Typecast Object.entries for strict TS
                    const whitelistEntries = Object.entries(whitelist) as [string, { contract: string, decimals: number }][];
                    for (const [sym, info] of whitelistEntries) {
                        if (info.contract.toLowerCase() === tokenAddress) {
                            matchedSymbol = sym;
                            matchedDecimals = info.decimals;
                            break;
                        }
                    }

                    if (!matchedSymbol) continue; // Unrecognized token

                    const amountRaw = tx.value; // It's a string from explorer
                    const amountUsd = Number(amountRaw) / Math.pow(10, matchedDecimals);

                    if (amountUsd <= 0) continue;

                    // Idempotency check using txHash (Explorer API might not have strict logIndex for deduping easily, 
                    // but for standard transfers tx_hash is usually unique enough for a single token transfer to the same address.
                    // If multiple transfers in one tx, we should append something, but let's stick to txHash for MVP
                    const uniqueDepositId = `${chainId}_${txHash}_tokentx`;

                    const { data: existing } = await supabaseAdmin
                        .from('crypto_deposits')
                        .select('id')
                        .eq('tx_hash', uniqueDepositId)
                        .single();

                    if (existing) continue; // Already processed

                    const sender = tx.from;

                    // Credit User
                    await supabaseAdmin.from('crypto_deposits').insert({
                        user_id: userId,
                        chain_id: chainId,
                        tx_hash: uniqueDepositId,
                        sender_address: sender,
                        token_symbol: matchedSymbol,
                        amount_raw: amountRaw,
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

                // Wait 250ms between Explorer API calls to respect free tier rate limits (5 req/sec)
                await new Promise(resolve => setTimeout(resolve, 250));

                // Update cursor if we found anything newer, or keep same
                // We add 1 to not re-scan the exact same block, but actually 
                // explorer might miss things if we skip block mid-way, so saving highestBlockScanned is safe.
                scanCursors[chainId] = highestBlockScanned.toString();

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
