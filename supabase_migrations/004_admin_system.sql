-- Migration: Create Admin Governance System
-- Run this in the Supabase SQL Editor

-- 1. Upgrade USERS table with Admin & Status flags
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_supermod BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT;

-- 2. Create ADMIN_AUDIT_LOGS table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id),
    target_user_id UUID REFERENCES public.users(id),
    action_type TEXT NOT NULL, -- e.g., 'BAN_USER', 'APPROVE_DEPOSIT', 'LOCK_CARD'
    metadata JSONB,            -- Store details like 'old_status', 'new_status', 'amount'
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create SYSTEM_STATS table (Performance caching for Admin Overview)
CREATE TABLE IF NOT EXISTS public.system_stats (
    id TEXT PRIMARY KEY DEFAULT 'global_stats',
    total_gmv NUMERIC(20, 2) DEFAULT 0.00,
    total_users INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize stats if empty
INSERT INTO public.system_stats (id, total_gmv, total_users, total_transactions)
VALUES ('global_stats', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 4. Admin Security Policies (RLS)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;

-- Only SuperMods can promote other admins
CREATE POLICY "SuperMods can update user roles" 
    ON public.users FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_supermod = true));

-- Admins can view everything
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can view all cards" ON public.cards FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can view all tokens" ON public.tokens FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can view system stats" ON public.system_stats FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- 5. Helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true);
$$ LANGUAGE sql SECURITY DEFINER;
