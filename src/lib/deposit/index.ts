// src/lib/deposit/index.ts
// Unified deposit verification engine
// Routes deposit requests to the correct chain adapter

import { DepositAdapter, DepositRequest, DepositVerification } from './types';
import { EvmAdapter } from './adapters/evm';
import { TronAdapter } from './adapters/tron';

// Adapter registry — add new chains here
const adapters: Record<string, () => DepositAdapter> = {
    base: () => new EvmAdapter('base'),
    ethereum: () => new EvmAdapter('ethereum'),
    bsc: () => new EvmAdapter('bsc'),
    tron: () => new TronAdapter(),
    // Future: usat: () => new SwapAdapter(),
    // Future: fiat: () => new FiatAdapter(),
};

/**
 * Verify a deposit transaction on any supported chain.
 * Returns structured verification result.
 */
export async function verifyDeposit(req: DepositRequest): Promise<DepositVerification> {
    const factory = adapters[req.chainId];

    if (!factory) {
        return {
            verified: false,
            error: `Unsupported chain: ${req.chainId}`,
            chainId: req.chainId,
            txHash: req.txHash,
            senderAddress: '',
            recipientAddress: '',
            tokenContract: '',
            tokenSymbol: '',
            amountRaw: '0',
            amountUsd: 0,
        };
    }

    const adapter = factory();
    return adapter.verifyTransaction(req.txHash);
}

export { CHAINS, TOKEN_WHITELIST, DEPOSIT_OPTIONS } from './config';
export type { DepositRequest, DepositVerification, ChainConfig } from './types';
