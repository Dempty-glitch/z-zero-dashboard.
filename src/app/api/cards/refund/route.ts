import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { cardId, userId } = await request.json();

        if (!cardId || !userId) {
            return NextResponse.json({ error: 'Missing cardId or userId' }, { status: 400 });
        }

        // 1. Fetch the card and its active token
        const { data: card, error: cardError } = await supabaseAdmin
            .from('cards')
            .select(`
                id,
                user_id,
                allocated_limit_usd,
                is_active,
                tokens (
                    id,
                    status,
                    authorized_amount
                )
            `)
            .eq('id', cardId)
            .eq('user_id', userId)
            .single();

        if (cardError || !card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        if (!card.is_active) {
            return NextResponse.json({ error: 'Card is already inactive' }, { status: 400 });
        }

        const activeToken = card.tokens?.find((t: any) => t.status === 'ACTIVE');
        if (!activeToken) {
            return NextResponse.json({ error: 'No active token found for this card' }, { status: 400 });
        }

        const refundAmount = Number(activeToken.authorized_amount);

        // 2. Performance Atomically:
        // - Mark token as REVOKED
        // - Mark card as inactive
        // - Refund balance to user wallet

        // Update token
        const { error: tokenUpdateError } = await supabaseAdmin
            .from('tokens')
            .update({ status: 'REVOKED' })
            .eq('id', activeToken.id);

        if (tokenUpdateError) throw tokenUpdateError;

        // Update card
        const { error: cardUpdateError } = await supabaseAdmin
            .from('cards')
            .update({ is_active: false })
            .eq('id', card.id);

        if (cardUpdateError) throw cardUpdateError;

        // Fetch wallet to update
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (walletError || !wallet) throw new Error('Wallet not found');

        const { error: walletUpdateError } = await supabaseAdmin
            .from('wallets')
            .update({ balance: Number(wallet.balance) + refundAmount })
            .eq('user_id', userId);

        if (walletUpdateError) throw walletUpdateError;

        // 3. Record a "REFUND" activity/transaction
        await supabaseAdmin.from('transactions').insert({
            card_id: card.id,
            token_id: activeToken.id,
            amount: refundAmount,
            merchant: 'Z-ZERO REFUND',
            status: 'REFUNDED'
        });

        return NextResponse.json({
            success: true,
            refunded_amount: refundAmount,
            message: `Successfully refunded $${refundAmount.toFixed(2)} to your wallet.`
        });

    } catch (err: any) {
        console.error('[REFUND_ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
