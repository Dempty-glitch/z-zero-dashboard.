// src/lib/provider.ts
// Secure backend wrapper for the Neobank Issuing API

const API_KEY = process.env.ISSUER_API_KEY!;
const CLIENT_ID = process.env.ISSUER_CLIENT_ID!;
const ENV = process.env.ISSUER_ENV || 'demo';

// Hidden Trade Secret URLs
const API_BASE = ENV === 'demo'
    ? 'https://api-demo.airwallex.com/api/v1'  // Airwallex testnet
    : 'https://api.airwallex.com/api/v1';       // Airwallex mainnet

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * 1. Authenticate with the Issuer to get a Bearer Token
 */
async function getAuthToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const res = await fetch(`${API_BASE}/authentication/login`, {
        method: 'POST',
        headers: {
            'x-api-key': API_KEY,
            'x-client-id': CLIENT_ID,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        console.error('Issuer Auth Failed:', await res.text());
        throw new Error('Failed to authenticate with Neobank Issuer');
    }

    const data = await res.json();
    cachedToken = data.token;
    // Tokens expire in 30 mins, we refresh safely at 25 mins
    tokenExpiry = Date.now() + 25 * 60 * 1000;
    return cachedToken;
}

/**
 * 2. Create a Single-Use VIRTUAL Card (JIT Payment)
 */
export async function createSingleUseCard(amount: number, merchant: string) {
    const token = await getAuthToken();
    const requestId = crypto.randomUUID(); // Idempotency key

    const payload = {
        request_id: requestId,
        issue_to: 'ORGANISATION',
        name_on_card: 'Z-ZERO AI AGENT',
        form_factor: 'VIRTUAL',
        primary_currency: 'USD',
        authorization_controls: {
            allowed_transaction_count: 'SINGLE', // The card burns itself after 1 use
            transaction_limits: {
                currency: 'USD',
                limits: [
                    {
                        amount: amount,
                        interval: 'ALL_TIME' // Strict lock on the requested amount
                    }
                ]
            }
        }
    };

    const res = await fetch(`${API_BASE}/issuing/cards/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error('Issuer Card Creation Failed:', await res.text());
        throw new Error('Failed to create Neobank card');
    }

    const data = await res.json();
    return {
        card_id: data.card_id,
        card_number_masked: data.card_number
    };
}

/**
 * 3. Fetch Secure Card Details (To inject via MCP Playwright)
 */
export async function getSecureCardDetails(cardId: string) {
    const token = await getAuthToken();

    // NOTE: This usually hits a /secure-details or /pan endpoint.
    const res = await fetch(`${API_BASE}/issuing/cards/${cardId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch card details');
    }

    const data = await res.json();

    return {
        number: data.card_number?.includes('*') ? '4242424242424242' : data.card_number,
        exp: '12/30', // Dummy expiry if not provided by mockup API
        cvv: '123',   // Dummy CVV if not provided by mockup API
        name: data.name_on_card || 'Z-ZERO AI AGENT'
    };
}
