import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // 1. Validate Token in DB
        const { data: dbToken, error: tokenError } = await supabaseAdmin
            .from('tokens')
            .select('*, cards(*)')
            .eq('token_value', token)
            .single();

        if (tokenError || !dbToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
        }

        if (dbToken.status !== 'ACTIVE') {
            return NextResponse.json({ error: `Token is ${dbToken.status}` }, { status: 400 });
        }

        if (new Date(dbToken.expires_at) < new Date()) {
            // Auto-expire
            await supabaseAdmin.from('tokens').update({ status: 'EXPIRED' }).eq('id', dbToken.id);
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        // 2. Fetch Card Data (Issuer Abstraction)
        // Normally this is where we call Airwallex. For MVP, we return the DB mock data.
        const card = dbToken.cards;

        // In a real app we decrypt here using a secure KMS key.
        const realCardData = {
            number: card.card_number_encrypted || "4242424242424242",
            exp: card.exp_encrypted || "12/30",
            cvv: card.cvv_encrypted || "123",
            name: "AI Virtual Card"
        };

        // Return the payload (NEVER LOG THIS)
        return NextResponse.json(realCardData);

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
