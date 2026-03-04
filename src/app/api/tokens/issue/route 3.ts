import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

        // In a real app: Hash apiKey and check public.users
        // For demo: Accept if it starts with zk_
        if (!apiKey.startsWith('zk_')) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // 2. Map alias to a Card ID
        const { data: cards, error: cardError } = await supabaseAdmin
            .from('cards')
            .select('id')
            .eq('alias', card_alias)
            .limit(1);

        if (cardError || !cards || cards.length === 0) {
            // Auto-create a demo card if not found for MVP testing
            const { data: newCard, error: newError } = await supabaseAdmin
                .from('cards')
                .insert({
                    alias: card_alias,
                    card_number_encrypted: '4111222233334444', // Demo data
                    exp_encrypted: '12/30',
                    cvv_encrypted: '123',
                    currency: 'USD',
                    allocated_limit_usd: 1000.00
                })
                .select('id')
                .single();

            if (newError || !newCard) {
                return NextResponse.json({ error: 'Card not found or could not be created' }, { status: 404 });
            }
            cards[0] = newCard;
        }

        const cardId = cards[0].id;

        // 3. Generate JIT Token (TTL: 15 mins)
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
            console.error(insertError);
            return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });
        }

        // 4. Return Output
        return NextResponse.json({
            token,
            expires_at: expiresAt
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
