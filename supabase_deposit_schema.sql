-- Z-ZERO Crypto Deposit Module Tables
-- Run this SQL in the Supabase SQL Editor

-- 1. Supported tokens whitelist
CREATE TABLE IF NOT EXISTS supported_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  decimals INT NOT NULL DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(chain_id, contract_address)
);

-- 2. Verified deposits (idempotent via UNIQUE constraint)
CREATE TABLE IF NOT EXISTS crypto_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  chain_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  sender_address TEXT,
  token_symbol TEXT NOT NULL,
  amount_raw TEXT NOT NULL,
  amount_usd DECIMAL(18,2) NOT NULL,
  status TEXT DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chain_id, tx_hash)
);

-- 3. Pending / unclaimed / confirming deposits
CREATE TABLE IF NOT EXISTS pending_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  chain_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  sender_address TEXT,
  token_symbol TEXT,
  amount_usd DECIMAL(18,2),
  status TEXT DEFAULT 'CONFIRMING',
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  UNIQUE(chain_id, tx_hash)
);

-- 4. Admin review queue for unrecognized deposits
CREATE TABLE IF NOT EXISTS pending_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  sender_address TEXT,
  raw_data JSONB,
  notes TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed supported tokens
INSERT INTO supported_tokens (chain_id, token_symbol, contract_address, decimals) VALUES
  ('base', 'USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6),
  ('ethereum', 'USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6),
  ('ethereum', 'USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6),
  ('bsc', 'USDT', '0x55d398326f99059fF775485246999027B3197955', 18),
  ('tron', 'USDT', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 6)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE crypto_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own deposits
CREATE POLICY "Users view own deposits" ON crypto_deposits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own pending" ON pending_deposits
  FOR SELECT USING (auth.uid() = user_id);

-- RLS: supported_tokens is public read
CREATE POLICY "Public read tokens" ON supported_tokens
  FOR SELECT USING (true);
