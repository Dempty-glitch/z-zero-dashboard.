-- Migration: Add Airwallex Card ID tracking to tokens table
-- Run this in Supabase SQL Editor
-- This enables webhook reconciliation: airwallex event → token → user_id

-- 1. Add airwallex_card_id to tokens table for webhook lookup
ALTER TABLE public.tokens
    ADD COLUMN IF NOT EXISTS airwallex_card_id TEXT UNIQUE;

-- 2. Add index for fast webhook lookups (card_id → token → user)
CREATE INDEX IF NOT EXISTS idx_tokens_airwallex_card_id 
    ON public.tokens (airwallex_card_id);

-- 3. Add REVOKED to token status enum (for declined transactions)
-- Note: Supabase CHECK constraints can't be altered easily.
-- Drop and recreate the check constraint:
ALTER TABLE public.tokens
    DROP CONSTRAINT IF EXISTS tokens_status_check;

ALTER TABLE public.tokens
    ADD CONSTRAINT tokens_status_check 
    CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED'));

-- 4. Add actual_amount to transactions table for underspend tracking
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS authorized_amount NUMERIC(10, 2);

-- Record what was authorized vs what was actually captured
-- authorized_amount = what was pre-held
-- amount = what was actually spent (from Airwallex webhook)
COMMENT ON COLUMN public.transactions.authorized_amount IS 'Original authorized/held amount. Difference with amount = refund returned to user.';
COMMENT ON COLUMN public.transactions.amount IS 'Actual captured amount from Airwallex webhook.';

-- 5. Add user_id directly to transactions for fast admin queries
-- (Denormalized for efficiency — can also query via card_id → cards.user_id)
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
    ON public.transactions (user_id);
