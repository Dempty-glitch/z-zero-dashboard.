// HD Wallet Library for Z-ZERO Custodial Wallets
// Uses BIP-39 Mnemonic + BIP-44 Derivation Paths
//
// Architecture:
//   Vercel env:  MASTER_MNEMONIC="12 random english words"
//   Supabase DB: user_id | wallet_index | evm_address | tron_address
//
// Private keys are DERIVED on-demand from MASTER_MNEMONIC + index.
// They are NEVER stored in the database. They exist only in RAM
// during the brief window when a transaction is being signed.

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { privateKeyToAddress } from 'viem/accounts';
import { bytesToHex } from 'viem';

// BIP-44 derivation paths
// m/purpose'/coin_type'/account'/change/address_index
const EVM_PATH_PREFIX = "m/44'/60'/0'/0";   // ETH, Base, BSC
const TRON_PATH_PREFIX = "m/44'/195'/0'/0"; // Tron

/**
 * Generate a new secure mnemonic (call once, store in Vercel env as MASTER_MNEMONIC).
 * This function is ONLY used during initial setup. Never call in production routes.
 */
export function generateMnemonic(): string {
    return bip39.generateMnemonic(wordlist, 128); // 12 words = 128 bits
}

/**
 * Derive the EVM (Ethereum-compatible) deposit address for a given index.
 * index 0 = User #1, index 1 = User #2, etc.
 */
export function deriveEVMWallet(mnemonic: string, index: number): {
    address: string;
    privateKey: string;
} {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive(`${EVM_PATH_PREFIX}/${index}`);

    if (!child.privateKey) {
        throw new Error(`Failed to derive EVM private key at index ${index}`);
    }

    const privateKey = bytesToHex(child.privateKey);
    const address = privateKeyToAddress(privateKey);

    return { address, privateKey };
}

/**
 * Derive the Tron deposit address for a given index.
 */
export async function deriveTronWallet(mnemonic: string, index: number): Promise<{
    address: string;
    privateKey: string;
}> {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive(`${TRON_PATH_PREFIX}/${index}`);

    if (!child.privateKey) {
        throw new Error(`Failed to derive Tron private key at index ${index}`);
    }

    const privateKeyHex = bytesToHex(child.privateKey).replace('0x', '');

    // Convert private key to Tron address using TronWeb
    // Dynamic import to avoid SSR issues with TronWeb
    const { TronWeb } = await import('tronweb');
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const address = tronWeb.address.fromPrivateKey(privateKeyHex);

    if (!address) {
        throw new Error(`Failed to derive Tron address at index ${index}`);
    }

    return { address: address as string, privateKey: privateKeyHex };
}

/**
 * Get MASTER_MNEMONIC from environment with validation.
 * Throws clearly if not configured — prevents silent failures.
 */
export function getMasterMnemonic(): string {
    const mnemonic = process.env.MASTER_MNEMONIC;
    if (!mnemonic) {
        throw new Error(
            'MASTER_MNEMONIC is not set in environment variables. ' +
            'Generate one with generateMnemonic() and add it to Vercel env vars.'
        );
    }
    if (!bip39.validateMnemonic(mnemonic, wordlist)) {
        throw new Error('MASTER_MNEMONIC is invalid — must be a valid BIP-39 mnemonic.');
    }
    return mnemonic;
}
