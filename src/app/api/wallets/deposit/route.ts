import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyDeposit } from '@/lib/deposit';

export async function POST(request: Request) {
    try {
        const { txHash, chainId, senderAddress, userId } = await request.json();

        if (!txHash || !chainId) {
            return NextResponse.json({ error: 'Missing txHash or chainId' }, { status: 400 });
        }

        // 1. Idempotency Check — Has this tx already been processed?
        const { data: existing } = await supabaseAdmin
            .from('crypto_deposits')
            .select('id')
            .eq('chain_id', chainId)
            .eq('tx_hash', txHash)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'This transaction has already been credited', duplicate: true }, { status: 409 });
        }

        // Also check pending_deposits
        const { data: existingPending } = await supabaseAdmin
            .from('pending_deposits')
            .select('id')
            .eq('chain_id', chainId)
            .eq('tx_hash', txHash)
            .single();

        if (existingPending) {
            return NextResponse.json({ error: 'This transaction is already being processed', duplicate: true }, { status: 409 });
        }

        // 2. Verify on-chain via the modular adapter
        const verification = await verifyDeposit({ txHash, chainId, senderAddress });

        // 3a. Transaction not yet confirmed (still pending on blockchain)
        if (!verification.verified && verification.error?.includes('pending')) {
            await supabaseAdmin.from('pending_deposits').insert({
                user_id: userId || null,
                chain_id: chainId,
                tx_hash: txHash,
                sender_address: senderAddress || null,
                status: 'CONFIRMING',
            });

            return NextResponse.json({
                status: 'CONFIRMING',
                message: 'Transaction is pending confirmation. Your balance will be updated automatically.'
            });
        }

        // 3b. Transaction failed or unrecognized token
        if (!verification.verified) {
            // Log to pending_reviews for Admin review
            await supabaseAdmin.from('pending_reviews').insert({
                chain_id: chainId,
                tx_hash: txHash,
                sender_address: senderAddress || verification.senderAddress,
                raw_data: verification,
                status: 'PENDING',
            });

            return NextResponse.json({
                error: verification.error || 'Deposit verification failed',
                status: 'REVIEW',
            }, { status: 400 });
        }

        // 4. Verification passed! Credit the user.
        const resolvedUserId = userId || null;

        if (resolvedUserId) {
            // 4a. User is logged in — credit directly
            await supabaseAdmin.from('crypto_deposits').insert({
                user_id: resolvedUserId,
                chain_id: chainId,
                tx_hash: txHash,
                sender_address: verification.senderAddress,
                token_symbol: verification.tokenSymbol,
                amount_raw: verification.amountRaw,
                amount_usd: verification.amountUsd,
                status: 'CONFIRMED',
            });

            // Update wallet balance
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('balance_usd')
                .eq('user_id', resolvedUserId)
                .single();

            if (wallet) {
                await supabaseAdmin
                    .from('wallets')
                    .update({ balance_usd: wallet.balance_usd + verification.amountUsd })
                    .eq('user_id', resolvedUserId);
            } else {
                // Create wallet if it doesn't exist
                await supabaseAdmin.from('wallets').insert({
                    user_id: resolvedUserId,
                    balance_usd: verification.amountUsd,
                });
            }

            return NextResponse.json({
                status: 'CONFIRMED',
                amount: verification.amountUsd,
                token: verification.tokenSymbol,
                chain: chainId,
                message: `$${verification.amountUsd.toFixed(2)} ${verification.tokenSymbol} credited to your balance!`,
            });

        } else {
            // 4b. No user session — store as unclaimed for auto-claim on registration
            await supabaseAdmin.from('pending_deposits').insert({
                user_id: null,
                chain_id: chainId,
                tx_hash: txHash,
                sender_address: verification.senderAddress,
                token_symbol: verification.tokenSymbol,
                amount_usd: verification.amountUsd,
                status: 'UNCLAIMED',
            });

            return NextResponse.json({
                status: 'UNCLAIMED',
                amount: verification.amountUsd,
                message: 'Deposit verified! Connect your wallet to claim this balance.',
            });
        }

    } catch (err: any) {
        console.error('Deposit API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
