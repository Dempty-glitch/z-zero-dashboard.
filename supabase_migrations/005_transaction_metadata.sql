-- Migration: Enhance Transaction Metadata for Admin Audit
-- Run this in the Supabase SQL Editor

-- 1. Add metadata columns to Transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS initiated_by TEXT DEFAULT 'HUMAN' CHECK (initiated_by IN ('HUMAN', 'BOT')),
ADD COLUMN IF NOT EXISTS system_metadata JSONB; -- Store browser version, IP, or Bot ID

-- 2. Add helpful indexes for admin filtering
CREATE INDEX IF NOT EXISTS idx_transactions_initiated_by ON public.transactions(initiated_by);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 3. Update existing transactions (optional)
UPDATE public.transactions SET initiated_by = 'BOT' WHERE token_id IS NOT NULL;
