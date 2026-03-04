const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const req = https.request('https://bsc-dataseed.binance.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let rawData = '';
    res.on('data', chunk => { rawData += chunk; });
    res.on('end', async () => {
        const receipt = JSON.parse(rawData).result;
        const logs = receipt.logs || [];

        console.log(`Checking ${logs.length} logs against DB...`);
        let matches = 0;

        for (const log of logs) {
            if (log.address.toLowerCase() === '0x55d398326f99059ff775485246999027b3197955') {
                if (log.topics && log.topics.length >= 3 && log.topics[0] === TRANSFER_TOPIC) {
                    const recipient = '0x' + log.topics[2].slice(26);

                    const { data, error } = await supabase
                        .from('deposit_wallets')
                        .select('user_id, evm_address')
                        .ilike('evm_address', recipient);

                    if (data && data.length > 0) {
                        const amountUsd = Number(BigInt(log.data)) / 1e18;
                        console.log('--- FOUND MATCH IN DB ---');
                        console.log('Recipient:', recipient);
                        console.log('User ID:', data[0].user_id);
                        console.log('Amount:', amountUsd);
                        matches++;
                    }
                }
            }
        }
        if (matches === 0) console.log("NO recipients matched any user in deposit_wallets!");
    });
});
req.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: ['0x9c9064d85cedc8d0b699695f92dcb703c4211c6bcab29cd5ca3f60a33ac0ba2f'] }));
req.end();
