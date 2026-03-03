import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { token, receipt_id, success } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // 1. Fetch Token
        const { data: dbToken, error: tokenError } = await supabaseAdmin
            .from('tokens')
            .select('id, card_id, merchant, authorized_amount')
            .eq('token_value', token)
            .single();

        if (tokenError || !dbToken) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }

        // 2. Burn the Token (Set to USED or FAILED based on success)
        const newStatus = success ? 'USED' : 'EXPIRED'; // or FAILED if we added it

        await supabaseAdmin
            .from('tokens')
            .update({ status: newStatus })
            .eq('id', dbToken.id);

        // 3. Record Transaction
        await supabaseAdmin
            .from('transactions')
            .insert({
                token_id: dbToken.id,
                card_id: dbToken.card_id,
                amount: dbToken.authorized_amount,
                merchant: dbToken.merchant,
                status: success ? 'SUCCESS' : 'FAILED',
                receipt_id: receipt_id || null
            });

        return NextResponse.json({
            status: 'BURNED',
            message: 'Token has been invalidated and transaction recorded.'
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
