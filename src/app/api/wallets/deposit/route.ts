import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { EvmAdapter } from '@/lib/deposit/adapters/evm';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name) { return cookieStore.get(name)?.value },
                },
            }
        );

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }

        const body = await request.json();
        const { txHash, chainId } = body;

        if (!txHash || !chainId) {
            return NextResponse.json({ error: 'Missing txHash or chainId' }, { status: 400 });
        }

        console.log(`[DEPOSIT] Verifying ${txHash} on ${chainId} for user ${userId}`);

        // 1. Verify transaction via EVM Adapter
        const adapter = new EvmAdapter(chainId);
        const result = await adapter.verifyTransaction(txHash);

        if (!result.verified) {
            return NextResponse.json({ error: result.error || 'Verification failed' }, { status: 400 });
        }

        // 2. Ensure Recipient Matches User's Custodial Wallet
        // Adapter returns `resolvedUserId` if it found a match in DB
        if (!result.resolvedUserId || result.resolvedUserId !== userId) {
            return NextResponse.json({
                error: `This transaction was not sent to your designated deposit wallet.`
            }, { status: 400 });
        }

        // 3. Idempotency check: Ensure TxHash isn't already credited
        const uniqueDepositId = `${chainId}_${txHash}_tokentx`; // Match format from scan if needed, or just txHash
        const { data: existing } = await supabaseAdmin
            .from('crypto_deposits')
            .select('id')
            .eq('tx_hash', uniqueDepositId)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'This transaction has already been credited' }, { status: 400 });
        }

        // 4. Record Deposit & Update Balance
        const { error: insertError } = await supabaseAdmin.from('crypto_deposits').insert({
            user_id: userId,
            chain_id: chainId,
            tx_hash: uniqueDepositId,
            sender_address: result.senderAddress,
            token_symbol: result.tokenSymbol,
            amount_raw: result.amountRaw,
            amount_usd: result.amountUsd,
            status: 'CONFIRMED',
        });

        if (insertError) throw insertError;

        // Update main wallet balance
        const { data: userWallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (userWallet) {
            await supabaseAdmin
                .from('wallets')
                .update({ balance: Number(userWallet.balance) + result.amountUsd })
                .eq('user_id', userId);
        } else {
            await supabaseAdmin.from('wallets').insert({
                user_id: userId,
                balance: result.amountUsd,
            });
        }

        return NextResponse.json({
            success: true,
            amount: result.amountUsd,
            message: `Successfully credited $${result.amountUsd.toFixed(2)} to your account!`
        });

    } catch (err: any) {
        console.error('Deposit Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
