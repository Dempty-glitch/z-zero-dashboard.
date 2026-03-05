// src/lib/deposit/config.ts
// Chain configurations and token whitelists

import { ChainConfig } from './types';

// Treasury Addresses (from env)
const EVM_TREASURY = process.env.NEXT_PUBLIC_TREASURY_EVM || '';
const TRON_TREASURY = process.env.TREASURY_TRON || '';

// Supported chain configurations
export const CHAINS: Record<string, ChainConfig> = {
    base: {
        chainId: 'base',
        displayName: 'Base',
        rpcUrl: process.env.RPC_URL_BASE || 'https://1rpc.io/base',
        rpcUrls: [
            'https://mainnet.base.org',
            'https://base.llamarpc.com',
            'https://base.blockpi.network/v1/rpc/public'
        ],
        treasuryAddress: EVM_TREASURY,
        explorerUrl: 'https://basescan.org',
        nativeCurrency: 'ETH',
        wagmiChainId: 8453,
    },
    ethereum: {
        chainId: 'ethereum',
        displayName: 'Ethereum',
        rpcUrl: process.env.RPC_URL_ETH || 'https://1rpc.io/eth',
        rpcUrls: [
            'https://eth.llamarpc.com',
            'https://rpc.ankr.com/eth',
            'https://ethereum.blockpi.network/v1/rpc/public'
        ],
        treasuryAddress: EVM_TREASURY,
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: 'ETH',
        wagmiChainId: 1,
    },
    bsc: {
        chainId: 'bsc',
        displayName: 'BNB Smart Chain',
        rpcUrl: process.env.RPC_URL_BSC || 'https://1rpc.io/bnb',
        rpcUrls: [
            'https://bsc-dataseed.binance.org',
            'https://binance.llamarpc.com',
            'https://rpc.ankr.com/bsc',
            'https://bsc.blockpi.network/v1/rpc/public'
        ],
        treasuryAddress: EVM_TREASURY,
        explorerUrl: 'https://bscscan.com',
        nativeCurrency: 'BNB',
        wagmiChainId: 56,
    },
    tron: {
        chainId: 'tron',
        displayName: 'Tron (TRC-20)',
        rpcUrl: 'https://api.trongrid.io',
        treasuryAddress: TRON_TREASURY,
        explorerUrl: 'https://tronscan.org',
        nativeCurrency: 'TRX',
    },
};

// Whitelisted stablecoin contracts per chain
export const TOKEN_WHITELIST: Record<string, Record<string, { contract: string; decimals: number }>> = {
    base: {
        USDC: { contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    },
    ethereum: {
        USDC: { contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        USDT: { contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    },
    bsc: {
        USDT: { contract: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    },
    tron: {
        USDT: { contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
    },
};

// Client-side chain list for the Deposit Modal UI
export const DEPOSIT_OPTIONS = [
    { chainId: 'base', tokens: ['USDC'], method: 'wallet' as const },
    { chainId: 'ethereum', tokens: ['USDC', 'USDT'], method: 'wallet' as const },
    { chainId: 'bsc', tokens: ['USDT'], method: 'wallet' as const },
    { chainId: 'tron', tokens: ['USDT'], method: 'manual' as const },
];
