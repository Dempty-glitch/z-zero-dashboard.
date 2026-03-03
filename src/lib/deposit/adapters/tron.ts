// src/lib/deposit/adapters/tron.ts
// Tron TRC-20 Adapter
// Verifies USDT TRC-20 transfers via TronGrid API

import { DepositAdapter, DepositVerification } from '../types';
import { CHAINS, TOKEN_WHITELIST } from '../config';

const TRONGRID_BASE = 'https://api.trongrid.io';

export class TronAdapter implements DepositAdapter {
    chainId = 'tron';
    private treasuryAddress: string;

    constructor() {
        this.treasuryAddress = CHAINS.tron.treasuryAddress;
    }

    async verifyTransaction(txHash: string): Promise<DepositVerification> {
        const empty: DepositVerification = {
            verified: false,
            chainId: 'tron',
            txHash,
            senderAddress: '',
            recipientAddress: '',
            tokenContract: '',
            tokenSymbol: '',
            amountRaw: '0',
            amountUsd: 0,
        };

        try {
            // 1. Fetch transaction info from TronGrid
            const res = await fetch(`${TRONGRID_BASE}/v1/transactions/${txHash}`, {
                headers: { 'Accept': 'application/json' },
            });

            if (!res.ok) {
                return { ...empty, error: 'Transaction not found on Tron network' };
            }

            const data = await res.json();
            const txData = data?.data?.[0];

            if (!txData) {
                return { ...empty, error: 'Transaction data unavailable' };
            }

            // Check if tx succeeded
            if (txData.ret?.[0]?.contractRet !== 'SUCCESS') {
                return { ...empty, error: 'Transaction failed on Tron network' };
            }

            // 2. Fetch transaction info for TRC-20 transfer details
            const infoRes = await fetch(`${TRONGRID_BASE}/v1/transactions/${txHash}/events`, {
                headers: { 'Accept': 'application/json' },
            });

            if (!infoRes.ok) {
                return { ...empty, error: 'Could not fetch transaction events' };
            }

            const infoData = await infoRes.json();
            const events = infoData?.data || [];

            // 3. Find TRC-20 Transfer event to our treasury
            const whitelist = TOKEN_WHITELIST.tron || {};

            for (const event of events) {
                if (event.event_name !== 'Transfer') continue;

                const to = event.result?.to || event.result?.[1];
                const from = event.result?.from || event.result?.[0];
                const value = event.result?.value || event.result?.[2];
                const contractAddress = event.contract_address;

                if (!to || !contractAddress) continue;

                // Check recipient matches our treasury (Tron addresses are base58)
                // TronGrid returns hex addresses, need to compare appropriately
                const recipientMatch = to === this.treasuryAddress ||
                    event.result?.to_address === this.treasuryAddress;

                if (!recipientMatch) {
                    // Try hex comparison
                    const toHex = to.toLowerCase();
                    const treasuryHex = this.treasuryAddress.toLowerCase();
                    if (toHex !== treasuryHex) continue;
                }

                // Check token whitelist
                let matchedSymbol = '';
                let matchedDecimals = 6;

                for (const [symbol, info] of Object.entries(whitelist)) {
                    if (info.contract === contractAddress) {
                        matchedSymbol = symbol;
                        matchedDecimals = info.decimals;
                        break;
                    }
                }

                if (!matchedSymbol) continue;

                const amountRaw = BigInt(value || '0');
                const amountUsd = Number(amountRaw) / Math.pow(10, matchedDecimals);

                return {
                    verified: true,
                    chainId: 'tron',
                    txHash,
                    senderAddress: from || '',
                    recipientAddress: this.treasuryAddress,
                    tokenContract: contractAddress,
                    tokenSymbol: matchedSymbol,
                    amountRaw: amountRaw.toString(),
                    amountUsd,
                };
            }

            return { ...empty, error: 'No matching TRC-20 transfer to treasury found' };

        } catch (err: any) {
            return { ...empty, error: `TronGrid API error: ${err.message}` };
        }
    }
}
