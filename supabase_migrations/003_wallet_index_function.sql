-- Additional SQL: Create the next_wallet_index RPC function
-- This is called by the /api/wallets/generate route to get an atomic,
-- race-condition-safe wallet index for each new user.
-- Run this AFTER running 002_deposit_wallets.sql

CREATE OR REPLACE FUNCTION next_wallet_index()
RETURNS INTEGER
LANGUAGE sql
AS $$
    SELECT nextval('deposit_wallet_index_seq')::INTEGER;
$$;
