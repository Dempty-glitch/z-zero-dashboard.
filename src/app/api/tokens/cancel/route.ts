import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deactivateCard } from '@/lib/provider';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // 1. Fetch Token
        const { data: dbToken, error: tokenError } = await supabaseAdmin
            .from('tokens')
            .select('*, cards(*)')
            .eq('token_value', token)
            .single();

        if (tokenError || !dbToken) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }

        if (dbToken.status !== 'ACTIVE') {
            return NextResponse.json({ error: `Token is already ${dbToken.status}` }, { status: 400 });
        }

        // 2. Deactivate Real Airwallex Card
        if (dbToken.airwallex_card_id) {
            try {
                await deactivateCard(dbToken.airwallex_card_id);
            } catch (apiErr) {
                console.error("Provider Deactivation Error:", apiErr);
                // We proceed to refund even if provider fails (user deserves their money back)
            }
        }

        // 3. Refund Wallet
        const userId = dbToken.user_id;
        const amount = dbToken.authorized_amount;

        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        const currentBalance = Number(wallet?.balance || 0);

        await supabaseAdmin
            .from('wallets')
            .update({ balance: currentBalance + amount })
            .eq('user_id', userId);

        // 4. Update Token Status
        await supabaseAdmin
            .from('tokens')
            .update({ status: 'CANCELLED' })
            .eq('id', dbToken.id);

        return NextResponse.json({
            success: true,
            refunded_amount: amount,
            message: 'Token cancelled and funds refunded.'
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
