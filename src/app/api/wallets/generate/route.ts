import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMasterMnemonic, deriveEVMWallet, deriveTronWallet } from '@/lib/hd-wallet';

// Service role bypasses RLS — needed for secure server-side wallet generation
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { user_id } = await request.json();

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        // 1. Check if this user already has wallets — idempotent endpoint
        const { data: existing } = await supabase
            .from('deposit_wallets')
            .select('evm_address, tron_address, wallet_index')
            .eq('user_id', user_id)
            .single();

        if (existing) {
            // Already has wallets — return them (safe to call multiple times)
            return NextResponse.json({
                evm_address: existing.evm_address,
                tron_address: existing.tron_address,
                wallet_index: existing.wallet_index,
                created: false,
            });
        }

        // 2. Get next wallet index atomically from Postgres sequence
        // This prevents race condition where 2 users sign up simultaneously
        const { data: seqResult, error: seqErr } = await supabase
            .rpc('next_wallet_index');

        if (seqErr || seqResult === null || seqResult === undefined) {
            console.error('[WALLET] Failed to get next index:', seqErr?.message);
            // Fallback: count existing wallets
            const { count } = await supabase
                .from('deposit_wallets')
                .select('*', { count: 'exact', head: true });
            var walletIndex = count || 0;
        } else {
            var walletIndex = Number(seqResult);
        }

        // 3. Derive wallet addresses from MASTER_MNEMONIC (private keys never stored)
        const mnemonic = getMasterMnemonic();
        const evmWallet = deriveEVMWallet(mnemonic, walletIndex);
        const tronWallet = await deriveTronWallet(mnemonic, walletIndex);

        // 4. Store ONLY public addresses + index in Supabase (NO private keys)
        const { data: newWallet, error: insertErr } = await supabase
            .from('deposit_wallets')
            .insert({
                user_id,
                wallet_index: walletIndex,
                evm_address: evmWallet.address,
                tron_address: tronWallet.address,
            })
            .select('evm_address, tron_address, wallet_index')
            .single();

        if (insertErr || !newWallet) {
            console.error('[WALLET] Insert failed:', insertErr?.message);
            return NextResponse.json(
                { error: 'Failed to save wallet addresses' },
                { status: 500 }
            );
        }

        console.log(`[WALLET] ✅ New wallets created for user ${user_id}`);
        console.log(`  EVM:  ${newWallet.evm_address}`);
        console.log(`  Tron: ${newWallet.tron_address}`);
        console.log(`  Index: ${newWallet.wallet_index}`);

        return NextResponse.json({
            evm_address: newWallet.evm_address,
            tron_address: newWallet.tron_address,
            wallet_index: newWallet.wallet_index,
            created: true,
        });

    } catch (err: any) {
        // Special case: MASTER_MNEMONIC not configured
        if (err.message?.includes('MASTER_MNEMONIC')) {
            return NextResponse.json(
                { error: 'Wallet system not configured. Contact admin.' },
                { status: 503 }
            );
        }
        console.error('[WALLET] Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    // Fetch existing wallets for a user
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
        return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: wallet, error } = await supabase
        .from('deposit_wallets')
        .select('evm_address, tron_address, created_at')
        .eq('user_id', user_id)
        .single();

    if (error || !wallet) {
        return NextResponse.json({ wallet: null });
    }

    return NextResponse.json({ wallet });
}
