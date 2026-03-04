// src/lib/deposit/adapters/evm.ts
// EVM Chain Adapter (Base, Ethereum, BSC)
// Verifies ERC-20 transfer transactions on-chain via RPC
// Supports deposits to both Treasury AND user custodial HD wallets

import { DepositAdapter, DepositVerification } from '../types';
import { CHAINS, TOKEN_WHITELIST } from '../config';
import { supabaseAdmin } from '@/lib/supabase';

// ERC-20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export class EvmAdapter implements DepositAdapter {
    chainId: string;
    private rpcUrl: string;
    private treasuryAddress: string;

    constructor(chainId: string) {
        const config = CHAINS[chainId];
        if (!config) throw new Error(`Unknown chain: ${chainId}`);
        this.chainId = chainId;
        this.rpcUrl = config.rpcUrl;
        this.treasuryAddress = config.treasuryAddress.toLowerCase();
    }

    private async rpcCall(method: string, params: unknown[]) {
        const res = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    }

    /**
     * Check if a recipient address is valid (Treasury OR a user's custodial deposit wallet).
     * Returns the userId if it's a user wallet, or 'treasury' if it's the treasury.
     */
    private async resolveRecipient(address: string): Promise<{ valid: boolean; userId?: string }> {
        const addr = address.toLowerCase();

        // Check treasury first (fast path)
        if (addr === this.treasuryAddress) {
            console.log(`[EvmAdapter] Recipient ${addr} is TREASURY`);
            return { valid: true };
        }

        // Check if it's a user's custodial deposit address
        const { data, error } = await supabaseAdmin
            .from('deposit_wallets')
            .select('user_id')
            .ilike('evm_address', addr)
            .single();

        if (error) {
            console.error(`[EvmAdapter] DB Lookup Error for ${addr}:`, error.message);
        }

        if (data) {
            console.log(`[EvmAdapter] Recipient ${addr} matches USER: ${data.user_id}`);
            return { valid: true, userId: data.user_id };
        }

        console.log(`[EvmAdapter] Recipient ${addr} NOT FOUND in DB`);
        return { valid: false };
    }

    async verifyTransaction(txHash: string): Promise<DepositVerification> {
        // 1. Get Transaction Receipt
        const receipt = await this.rpcCall('eth_getTransactionReceipt', [txHash]);

        if (!receipt) {
            return { verified: false, error: 'Transaction not found or still pending', chainId: this.chainId, txHash, senderAddress: '', recipientAddress: '', tokenContract: '', tokenSymbol: '', amountRaw: '0', amountUsd: 0 };
        }

        // Check if tx succeeded
        if (receipt.status !== '0x1') {
            return { verified: false, error: 'Transaction failed on-chain', chainId: this.chainId, txHash, senderAddress: '', recipientAddress: '', tokenContract: '', tokenSymbol: '', amountRaw: '0', amountUsd: 0 };
        }

        // 2. Parse ERC-20 Transfer logs
        const whitelist = TOKEN_WHITELIST[this.chainId] || {};

        for (const log of receipt.logs || []) {
            // Check for Transfer event
            if (log.topics?.[0] !== TRANSFER_TOPIC) continue;
            if (log.topics.length < 3) continue;

            // Decode sender & recipient from topics
            const sender = '0x' + log.topics[1].slice(26);
            const recipient = '0x' + log.topics[2].slice(26);

            // Check recipient is our treasury OR a user's custodial deposit wallet
            const recipientInfo = await this.resolveRecipient(recipient);
            if (!recipientInfo.valid) continue;

            // Check if token contract is whitelisted
            const tokenAddress = log.address.toLowerCase();
            let matchedSymbol = '';
            let matchedDecimals = 6;

            for (const [symbol, info] of Object.entries(whitelist)) {
                if (info.contract.toLowerCase() === tokenAddress) {
                    matchedSymbol = symbol;
                    matchedDecimals = info.decimals;
                    break;
                }
            }

            if (!matchedSymbol) continue; // Not a whitelisted token

            // Decode amount from data
            const amountRaw = BigInt(log.data);
            const amountUsd = Number(amountRaw) / Math.pow(10, matchedDecimals);

            return {
                verified: true,
                chainId: this.chainId,
                txHash,
                senderAddress: sender,
                recipientAddress: recipient,
                tokenContract: tokenAddress,
                tokenSymbol: matchedSymbol,
                amountRaw: amountRaw.toString(),
                amountUsd,
                // Pass along resolved userId so the deposit route can credit the right user
                resolvedUserId: recipientInfo.userId,
            };
        }

        // No matching ERC-20 transfer found
        return {
            verified: false,
            error: 'No matching stablecoin transfer found to your deposit address in this transaction',
            chainId: this.chainId,
            txHash,
            senderAddress: receipt.from || '',
            recipientAddress: '',
            tokenContract: '',
            tokenSymbol: '',
            amountRaw: '0',
            amountUsd: 0,
        };
    }
}
