import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSingleUseCard } from '@/lib/provider';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { card_alias, amount, merchant } = await request.json();

        // Validate amount constraints from business rules
        if (!amount || amount < 1 || amount > 100) {
            return NextResponse.json(
                { error: 'Amount must be between $1 and $100 USD' },
                { status: 400 }
            );
        }

        // 1. Authenticate Request
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const apiKey = authHeader.split(' ')[1];

        if (!apiKey.startsWith('zk_')) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // Resolve user ID from API key for wallet operations
        const { data: cardRow } = await supabaseAdmin
            .from('cards')
            .select('user_id')
            .eq('card_number_encrypted', apiKey)
            .eq('is_active', true)
            .single();

        const userId = cardRow?.user_id;

        // 2. Map JIT payment to a real Single-Use Card via Airwallex
        let providerCardId = '';
        let maskedNumber = '';

        try {
            const providerCard = await createSingleUseCard(amount, merchant);
            providerCardId = providerCard.card_id;
            maskedNumber = providerCard.card_number_masked;
        } catch (apiErr) {
            console.error('Issuer API Error:', apiErr);
            return NextResponse.json({ error: 'Failed to provision neobank card' }, { status: 502 });
        }

        // 3. Pre-deduct balance from user wallet (Hold)
        if (userId) {
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('balance')
                .eq('user_id', userId)
                .single();

            const currentBalance = Number(wallet?.balance || 0);
            if (currentBalance < amount) {
                return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
            }

            await supabaseAdmin
                .from('wallets')
                .update({ balance: currentBalance - amount })
                .eq('user_id', userId);
        }

        // 3. Store the new JIT card in Supabase
        const { data: newCard, error: newError } = await supabaseAdmin
            .from('cards')
            .insert({
                user_id: userId,
                alias: `JIT-${crypto.randomBytes(4).toString('hex')}`, // Unique temp alias
                provider_card_id: providerCardId,
                card_number_encrypted: maskedNumber, // We only store masked centrally
                currency: 'USD',
                allocated_limit_usd: amount
            })
            .select('id')
            .single();

        if (newError || !newCard) {
            return NextResponse.json({ error: 'Database error provisioning card' }, { status: 500 });
        }

        const cardId = newCard.id;

        // 4. Generate JIT Token (TTL: 30 mins) tied to this card
        const token = 'temp_auth_' + crypto.randomBytes(8).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

        const { error: insertError } = await supabaseAdmin
            .from('tokens')
            .insert({
                card_id: cardId,
                token_value: token,
                authorized_amount: amount,
                merchant: merchant,
                status: 'ACTIVE',
                expires_at: expiresAt,
                airwallex_card_id: providerCardId, // 🔑 Enables webhook reconciliation
                user_id: userId,                   // Denormalized for fast lookups
            });

        if (insertError) {
            return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });
        }

        return NextResponse.json({
            token,
            expires_at: expiresAt
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
