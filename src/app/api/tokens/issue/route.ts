import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSingleUseCard } from '@/lib/provider';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { card_alias, amount, merchant } = await request.json();

        // 1. Authenticate Request
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const apiKey = authHeader.split(' ')[1];

        if (!apiKey.startsWith('zk_')) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // Optional: Deduct balance from internal wallet here...

        // 2. Map JIT payment to a real Single-Use Card
        let providerCardId = '';
        let maskedNumber = '';

        try {
            // 🚀 ISSUER ABSTRACTION: Call backend provider
            const providerCard = await createSingleUseCard(amount, merchant);
            providerCardId = providerCard.card_id;
            maskedNumber = providerCard.card_number_masked;
        } catch (apiErr) {
            console.error("Issuer API Error:", apiErr);
            return NextResponse.json({ error: 'Failed to provision neobank card' }, { status: 502 });
        }

        // 3. Store the new JIT card in Supabase
        const { data: newCard, error: newError } = await supabaseAdmin
            .from('cards')
            .insert({
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

        // 4. Generate JIT Token (TTL: 15 mins) tied to this card
        const token = 'temp_auth_' + crypto.randomBytes(8).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

        const { error: insertError } = await supabaseAdmin
            .from('tokens')
            .insert({
                card_id: cardId,
                token_value: token,
                authorized_amount: amount,
                merchant: merchant,
                status: 'ACTIVE',
                expires_at: expiresAt
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
