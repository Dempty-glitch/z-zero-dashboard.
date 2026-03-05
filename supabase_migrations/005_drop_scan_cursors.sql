-- 005_drop_scan_cursors.sql
-- Remove the scan_cursors column since we migrated to the Connect Wallet TxHash verification flow

ALTER TABLE deposit_wallets DROP COLUMN IF EXISTS scan_cursors;
