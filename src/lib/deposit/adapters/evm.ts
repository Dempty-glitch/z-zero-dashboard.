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
    private rpcUrls: string[];
    private treasuryAddress: string;

    constructor(chainId: string) {
        const config = CHAINS[chainId];
        if (!config) throw new Error(`Unknown chain: ${chainId}`);
        this.chainId = chainId;
        // Combine primary and fallback RPCs
        this.rpcUrls = [config.rpcUrl, ...(config.rpcUrls || [])];
        this.treasuryAddress = config.treasuryAddress.toLowerCase();
    }

    private async rpcCall(method: string, params: unknown[], forceUrl?: string) {
        const urls = forceUrl ? [forceUrl] : this.rpcUrls;
        let lastError: any = null;

        for (const url of urls) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                if (data.error) {
                    // Specific handling for common rate limits
                    if (data.error.message.includes('limit') || data.error.code === -32005) {
                        console.warn(`[EvmAdapter] Rate limit on ${url}, trying next...`);

                        // [PA-4] Log system alert to DB for Admin monitoring
                        await supabaseAdmin.from('system_health').insert({
                            component: `RPC_${this.chainId.toUpperCase()}`,
                            status: 'WARNING',
                            message: `Rate limit exceeded on provider: ${url}`,
                            metadata: { url, error: data.error, method }
                        });

                        lastError = data.error;
                        continue;
                    }
                    throw new Error(data.error.message);
                }
                return data.result;
            } catch (err: any) {
                console.warn(`[EvmAdapter] RPC Error on ${url}:`, err.message);

                // Track non-limit errors as well if they persist
                await supabaseAdmin.from('system_health').insert({
                    component: `RPC_${this.chainId.toUpperCase()}`,
                    status: 'ERROR',
                    message: `RPC error: ${err.message}`,
                    metadata: { url, method, error: err.message }
                });

                lastError = err;
            }
        }
        throw new Error(`All RPCs failed for ${this.chainId}: ${lastError?.message || 'Unknown error'}`);
    }

    async getLatestBlock(): Promise<number> {
        const hex = await this.rpcCall('eth_blockNumber', []);
        return parseInt(hex, 16);
    }

    /**
     * Efficiently scan for logs across a range of blocks with chunking and fallback.
     */
    async scanLogs(fromBlock: number, toBlock: number, tokenContract: string, recipientTopic: string) {
        const MAX_CHUNK = 1000; // Smaller chunks are safer for free RPCs
        let currentFrom = fromBlock;
        let allLogs: any[] = [];

        while (currentFrom <= toBlock) {
            const currentTo = Math.min(currentFrom + MAX_CHUNK, toBlock);
            console.log(`[EvmAdapter] Scanning ${this.chainId} blocks ${currentFrom} to ${currentTo}...`);

            try {
                const result = await this.rpcCall('eth_getLogs', [{
                    fromBlock: '0x' + currentFrom.toString(16),
                    toBlock: '0x' + (currentTo === toBlock ? 'latest' : currentTo.toString(16)),
                    address: tokenContract,
                    topics: [TRANSFER_TOPIC, null, recipientTopic]
                }]);

                if (result && Array.isArray(result)) {
                    allLogs = [...allLogs, ...result];
                }

                currentFrom = currentTo + 1;
            } catch (err: any) {
                console.error(`[EvmAdapter] Error scanning chunk ${currentFrom}-${currentTo}:`, err.message);

                // If the error is likely a range or provider issue, we can try to continue but we throw for now 
                // to let the higher level rotation handle it if it was a total failure.
                throw err;
            }
        }
        return allLogs;
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
