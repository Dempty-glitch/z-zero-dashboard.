import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        // 1. Authenticate Request
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const apiKey = authHeader.split(' ')[1];

        // 2. Resolve User from API Key (Passport)
        const { data: cardRow, error: authError } = await supabaseAdmin
            .from('cards')
            .select('user_id, alias')
            .eq('card_number_encrypted', apiKey)
            .eq('is_active', true)
            .single();

        if (authError || !cardRow) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        const userId = cardRow.user_id;

        // 3. Fetch Wallet Balance
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        // 4. Fetch Deposit Wallets
        const { data: depositWallet } = await supabaseAdmin
            .from('deposit_wallets')
            .select('evm_address, tron_address')
            .eq('user_id', userId)
            .single();

        // 5. Return simplified card list + deposit info
        return NextResponse.json({
            cards: [
                {
                    alias: cardRow.alias,
                    balance: Number(wallet?.balance || 0),
                    currency: 'USD'
                }
            ],
            deposit_addresses: {
                evm: depositWallet?.evm_address || null,
                tron: depositWallet?.tron_address || null
            },
            user_id: userId
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
