import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSecureCardDetails } from '@/lib/airwallex';

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
            await supabaseAdmin.from('tokens').update({ status: 'EXPIRED' }).eq('id', dbToken.id);
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        // 2. Fetch Real Card Data from Airwallex
        const card = dbToken.cards;

        if (!card.provider_card_id) {
            return NextResponse.json({ error: 'Missing provider card ID' }, { status: 500 });
        }

        let realCardData;
        try {
            // 🚀 ISSUER ABSTRACTION: Fetch PAN securely from Airwallex (does not touch disk)
            realCardData = await getSecureCardDetails(card.provider_card_id);
        } catch (apiErr) {
            console.error("Airwallex API Error:", apiErr);
            return NextResponse.json({ error: 'Failed to resolve card details from Neobank' }, { status: 502 });
        }

        // Return the payload back to the local MCP Playwright strictly in-memory
        return NextResponse.json({
            number: realCardData.number,
            exp: realCardData.exp,
            cvv: realCardData.cvv,
            name: realCardData.name
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
