import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for webhook operations (bypasses RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Airwallex signs webhook events — verify signature to prevent spoofing
function verifyAirwallexSignature(
    body: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature || !secret) return false;
    const crypto = require('crypto');
    const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return signature === expected;
}

export async function POST(request: Request) {
    const rawBody = await request.text();
    const webhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET || '';

    // 1. Verify signature (skip in dev/demo if no secret configured)
    if (webhookSecret) {
        const signature = request.headers.get('x-airwallex-signature');
        if (!verifyAirwallexSignature(rawBody, signature, webhookSecret)) {
            console.error('[WEBHOOK] Invalid signature — request rejected');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    }

    let event: any;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = event?.name || event?.event_type;
    console.log(`[WEBHOOK] Received event: ${eventType}`);

    // 2. Handle card transaction events
    if (
        eventType === 'card.transaction.captured' ||
        eventType === 'issuing.transaction.captured'
    ) {
        await handleTransactionCaptured(event);
    }

    if (
        eventType === 'card.transaction.declined' ||
        eventType === 'issuing.transaction.declined'
    ) {
        await handleTransactionDeclined(event);
    }

    if (
        eventType === 'card.expired' ||
        eventType === 'issuing.card.expired'
    ) {
        await handleCardExpired(event);
    }

    // Always return 200 to Airwallex to acknowledge receipt
    return NextResponse.json({ received: true });
}

// ============================================================
// Handler: Transaction Captured (Money actually moved)
// This is our primary reconciliation event
// ============================================================
async function handleTransactionCaptured(event: any) {
    const data = event?.data || event;
    const airwallexCardId = data?.card_id || data?.card?.id;
    const actualAmount = Number(data?.transaction_amount || data?.amount || 0);
    const currency = data?.transaction_currency || data?.currency || 'USD';
    const merchantName = data?.merchant_name || data?.merchant?.name || 'Unknown';
    const transactionId = data?.transaction_id || data?.id;

    if (!airwallexCardId || !actualAmount) {
        console.error('[WEBHOOK/captured] Missing card_id or amount in event');
        return;
    }

    console.log(`[WEBHOOK/captured] card=${airwallexCardId} actual=$${actualAmount} merchant=${merchantName}`);

    // 3. Find the token that matches this Airwallex card_id
    const { data: token, error: tokenErr } = await supabase
        .from('tokens')
        .select('id, card_id, authorized_amount, status, cards(user_id)')
        .eq('airwallex_card_id', airwallexCardId)
        .in('status', ['ACTIVE', 'USED'])
        .single();

    if (tokenErr || !token) {
        console.error('[WEBHOOK/captured] No matching token for card:', airwallexCardId, tokenErr?.message);
        return;
    }

    const authorizedAmount = Number(token.authorized_amount);
    const underspend = authorizedAmount - actualAmount;
    // @ts-ignore — Supabase join returns nested object
    const userId = token.cards?.user_id;

    if (!userId) {
        console.error('[WEBHOOK/captured] Could not resolve user_id for token:', token.id);
        return;
    }

    // 4. Idempotency check — skip if already reconciled
    const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('receipt_id', transactionId)
        .single();

    if (existingTx) {
        console.log('[WEBHOOK/captured] Transaction already reconciled, skipping');
        return;
    }

    // 5. Log the actual transaction
    await supabase.from('transactions').insert({
        card_id: token.card_id,
        token_id: token.id,
        amount: actualAmount,
        merchant: merchantName,
        status: 'SUCCESS',
        receipt_id: transactionId,
    });

    // 6. Mark token as USED
    await supabase
        .from('tokens')
        .update({ status: 'USED' })
        .eq('id', token.id);

    // 7. Refund underspend to user's wallet
    if (underspend > 0) {
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        const currentBalance = Number(wallet?.balance || 0);
        const newBalance = currentBalance + underspend;

        await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('user_id', userId);

        console.log(`[WEBHOOK/captured] ✅ Refunded underspend $${underspend.toFixed(2)} → user ${userId}. New balance: $${newBalance.toFixed(2)}`);
    } else {
        console.log(`[WEBHOOK/captured] ✅ Exact spend, no refund needed`);
    }
}

// ============================================================
// Handler: Transaction Declined
// Card was declined — release the full hold back to user wallet
// ============================================================
async function handleTransactionDeclined(event: any) {
    const data = event?.data || event;
    const airwallexCardId = data?.card_id || data?.card?.id;
    const declineCode = data?.decline_code || 'UNKNOWN';

    if (!airwallexCardId) return;

    console.log(`[WEBHOOK/declined] card=${airwallexCardId} reason=${declineCode}`);

    const { data: token, error } = await supabase
        .from('tokens')
        .select('id, card_id, authorized_amount, status, cards(user_id)')
        .eq('airwallex_card_id', airwallexCardId)
        .eq('status', 'ACTIVE')
        .single();

    if (error || !token) return;

    // @ts-ignore
    const userId = token.cards?.user_id;
    if (!userId) return;

    // Full refund — transaction declined means no money moved
    const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

    const currentBalance = Number(wallet?.balance || 0);
    await supabase
        .from('wallets')
        .update({ balance: currentBalance + Number(token.authorized_amount) })
        .eq('user_id', userId);

    // Mark token as REVOKED
    await supabase
        .from('tokens')
        .update({ status: 'REVOKED' })
        .eq('id', token.id);

    console.log(`[WEBHOOK/declined] ✅ Full refund $${token.authorized_amount} → user ${userId}`);
}

// ============================================================
// Handler: Card Expired (30-min TTL passed unused)
// Release full hold back to user wallet
// ============================================================
async function handleCardExpired(event: any) {
    const data = event?.data || event;
    const airwallexCardId = data?.card_id || data?.id;

    if (!airwallexCardId) return;

    console.log(`[WEBHOOK/expired] card=${airwallexCardId}`);

    const { data: token, error } = await supabase
        .from('tokens')
        .select('id, authorized_amount, status, cards(user_id)')
        .eq('airwallex_card_id', airwallexCardId)
        .eq('status', 'ACTIVE')
        .single();

    if (error || !token) return;

    // @ts-ignore
    const userId = token.cards?.user_id;
    if (!userId) return;

    const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

    const currentBalance = Number(wallet?.balance || 0);
    await supabase
        .from('wallets')
        .update({ balance: currentBalance + Number(token.authorized_amount) })
        .eq('user_id', userId);

    await supabase
        .from('tokens')
        .update({ status: 'EXPIRED' })
        .eq('id', token.id);

    console.log(`[WEBHOOK/expired] ✅ Refunded expired card hold $${token.authorized_amount} → user ${userId}`);
}
