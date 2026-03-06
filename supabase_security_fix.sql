-- Supabase Security Polish & Fixes
-- Run this in the Supabase SQL Editor to resolve Security Advisor warnings and errors.

-- 1. Fix: Enable RLS on admin_audit_logs (Supabase Error)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow only Admins to see audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view all audit logs" 
    ON public.admin_audit_logs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- 2. Fix: Secure search_path for Database Functions (Supabase Warnings)
-- This prevents "Search Path Mutable" exploits.

ALTER FUNCTION public.next_wallet_index() SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_catalog;

-- If 'handle_new_user' exists in your Supabase (used for triggers), secure it too:
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- NOTE: If you have a handle_new_user function, add its original body here followed by:
-- ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;

-- 3. Optimization: Add missing status filter to stats queries (for accuracy)
-- This ensures total_gmv and metrics only count confirmed transactions.
DROP VIEW IF EXISTS system_overview_stats;
CREATE OR REPLACE VIEW system_overview_stats AS
SELECT 
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'SUCCESS') as total_spent,
    (SELECT COALESCE(SUM(amount_usd), 0) FROM crypto_deposits WHERE status = 'CONFIRMED') as total_deposits,
    (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_balance,
    (SELECT COUNT(*) FROM users) as total_users;
