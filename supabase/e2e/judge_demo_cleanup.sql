-- ============================================================
-- NIRMALTAG — JUDGE DEMONSTRATION DATA CLEANUP SCRIPT
-- File: supabase/e2e/judge_demo_cleanup.sql
-- Safely Removes ONLY 'JUDGE-DEMO' Synthetic Records
-- ============================================================

DO $$
BEGIN
    -- Delete demo pickups & evidence
    DELETE FROM pickups WHERE idempotency_key LIKE 'SYNC-DEMO-%';

    -- Delete demo tags
    DELETE FROM tags WHERE canonical_code LIKE 'NT-SAN-2026-9172%';

    -- Delete demo batches
    DELETE FROM tag_batches WHERE batch_number LIKE 'BATCH-JUDGE-DEMO-%';

    -- Delete demo officer profiles
    DELETE FROM officer_profiles WHERE badge_number IN ('TAG-OFF-2026-99', 'MCD-INSP-2026-42');

    -- Delete demo collectors & credit accounts & households
    DELETE FROM credit_accounts WHERE household_id IN (
        SELECT id FROM households WHERE user_id IN (
            SELECT id FROM profiles WHERE firebase_uid LIKE 'DEMO_UID_%'
        )
    );

    DELETE FROM households WHERE user_id IN (
        SELECT id FROM profiles WHERE firebase_uid LIKE 'DEMO_UID_%'
    );

    DELETE FROM collectors WHERE user_id IN (
        SELECT id FROM profiles WHERE firebase_uid LIKE 'DEMO_UID_%'
    );

    -- Delete user_roles for demo profiles
    DELETE FROM user_roles WHERE user_id IN (
        SELECT id FROM profiles WHERE firebase_uid LIKE 'DEMO_UID_%'
    );

    -- Delete demo profiles
    DELETE FROM profiles WHERE firebase_uid LIKE 'DEMO_UID_%';

    -- Delete demo organizations
    DELETE FROM bwgs WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%Judge Demo%');
    DELETE FROM rwas WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%Judge Demo%');
    DELETE FROM organizations WHERE name LIKE '%Judge Demo%';

    -- Delete demo wards & zones
    DELETE FROM mcd_wards WHERE ward_code = 'JUDGE-DEMO-WARD';
    DELETE FROM mcd_zones WHERE zone_code = 'JUDGE-DEMO-ZONE';

    RAISE NOTICE 'Judge demonstration data cleaned up successfully.';
END $$;
