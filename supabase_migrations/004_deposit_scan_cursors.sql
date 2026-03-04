-- 004_deposit_scan_cursors.sql
-- Add tracking columns for auto-scan deposit flow

-- Track the last scanned block for EVM networks (Base, BSC, ETH share similar block concepts, 
-- but we might need per-network tracking if users frequently switch. 
-- For simplicity, let's track the lowest common denominator or track per network).
-- Given we support multiple EVM networks on one address, we should track it per chain_id or globally if we assume the user only uses one.
-- Actually, the safest is to track it per network in a JSON object or just a generalized evm_last_scanned_block if we scan them sequentially.
-- Let's use a JSONB column to store cursors for flexibility: { "bsc": 5000000, "base": 123456 }

ALTER TABLE deposit_wallets 
ADD COLUMN IF NOT EXISTS scan_cursors JSONB DEFAULT '{}'::jsonb;
