// src/lib/deposit/types.ts
// Shared interfaces for the modular deposit system

export interface DepositRequest {
    txHash: string;
    chainId: string;
    senderAddress?: string;
    tokenSymbol?: string;
    declaredAmount?: number;
}

export interface DepositVerification {
    verified: boolean;
    chainId: string;
    txHash: string;
    senderAddress: string;
    recipientAddress: string;
    tokenContract: string;
    tokenSymbol: string;
    amountRaw: string;
    amountUsd: number;
    error?: string;
}

export interface DepositAdapter {
    chainId: string;
    verifyTransaction(txHash: string): Promise<DepositVerification>;
}

export interface ChainConfig {
    chainId: string;
    displayName: string;
    rpcUrl: string;
    treasuryAddress: string;
    explorerUrl: string;
    nativeCurrency: string;
    wagmiChainId?: number; // For EVM chains
}
