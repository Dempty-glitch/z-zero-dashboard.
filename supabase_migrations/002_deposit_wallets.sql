-- Migration: Create deposit_wallets table for HD Wallet custodial system
-- Architecture: BIP-44 HD Wallet — ONLY wallet_index is stored (NO private keys)
-- Private keys are derived on-demand: MASTER_MNEMONIC + wallet_index → private key
-- Run this in Supabase SQL Editor

-- 1. Create deposit_wallets table
CREATE TABLE IF NOT EXISTS public.deposit_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    wallet_index INTEGER NOT NULL UNIQUE,           -- BIP-44 derivation index (0, 1, 2...)
    evm_address TEXT NOT NULL UNIQUE,               -- 0x... address (ETH/Base/BSC)
    tron_address TEXT NOT NULL UNIQUE,              -- T... address (Tron)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_deposit_wallets_user_id
    ON public.deposit_wallets (user_id);

-- 3. Index for fast address-based webhook/scanner lookups
CREATE INDEX IF NOT EXISTS idx_deposit_wallets_evm_address
    ON public.deposit_wallets (evm_address);

CREATE INDEX IF NOT EXISTS idx_deposit_wallets_tron_address
    ON public.deposit_wallets (tron_address);

-- 4. Wallet index counter — ensures no two users get the same index
-- We use a sequence for atomic, race-condition-safe auto-increment
CREATE SEQUENCE IF NOT EXISTS deposit_wallet_index_seq START 0 INCREMENT 1 MINVALUE 0;

-- 5. Enable RLS
ALTER TABLE public.deposit_wallets ENABLE ROW LEVEL SECURITY;

-- 6. Users can only read their own wallet (addresses are public but we still scope)
CREATE POLICY "Users can view own deposit wallet"
    ON public.deposit_wallets FOR SELECT
    USING (auth.uid() = user_id);
