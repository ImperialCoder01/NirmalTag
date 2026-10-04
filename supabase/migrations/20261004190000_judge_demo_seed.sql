-- ============================================================
-- NIRMALTAG — JUDGE DEMONSTRATION DATASET SEED MIGRATION
-- Migration Version: 20261004190000_judge_demo_seed.sql
-- Isolated, Idempotent Synthetic Demonstration Data
-- ============================================================

DO $$
DECLARE
    v_zone_id UUID := '10000000-0000-0000-0000-000000000001';
    v_ward_id UUID := '10000000-0000-0000-0000-000000000002';
    v_rwa_org_id UUID := '10000000-0000-0000-0000-000000000003';
    v_bwg_org_id UUID := '10000000-0000-0000-0000-000000000004';
    v_mcd_org_id UUID := '10000000-0000-0000-0000-000000000005';
    v_category_id UUID;
    v_batch_id UUID := '10000000-0000-0000-0000-000000000006';
    
    -- Profile UUIDs
    v_hh1_id UUID := '20000000-0000-0000-0000-000000000001';
    v_hh2_id UUID := '20000000-0000-0000-0000-000000000002';
    v_hh3_id UUID := '20000000-0000-0000-0000-000000000003';
    v_col_id UUID := '20000000-0000-0000-0000-000000000021';
    v_tag_off_id UUID := '20000000-0000-0000-0000-000000000022';
    v_rwa_admin_id UUID := '20000000-0000-0000-0000-000000000023';
    v_bwg_admin_id UUID := '20000000-0000-0000-0000-000000000024';
    v_mcd_off_id UUID := '20000000-0000-0000-0000-000000000025';
    v_sys_admin_id UUID := '20000000-0000-0000-0000-000000000026';

    v_hh1_house_id UUID := '30000000-0000-0000-0000-000000000001';
    v_hh2_house_id UUID := '30000000-0000-0000-0000-000000000002';
    v_collector_entity_id UUID := '30000000-0000-0000-0000-000000000021';

    -- Roles
    v_role_hh UUID;
    v_role_col UUID;
    v_role_tag UUID;
    v_role_rwa UUID;
    v_role_bwg UUID;
    v_role_mcd UUID;
    v_role_sys UUID;

BEGIN
    -- Resolve Role UUIDs
    SELECT id INTO v_role_hh FROM roles WHERE name = 'HOUSEHOLD';
    SELECT id INTO v_role_col FROM roles WHERE name = 'COLLECTOR';
    SELECT id INTO v_role_tag FROM roles WHERE name = 'TAG_OFFICER';
    SELECT id INTO v_role_rwa FROM roles WHERE name = 'RWA_ADMIN';
    SELECT id INTO v_role_bwg FROM roles WHERE name = 'BWG_ADMIN';
    SELECT id INTO v_role_mcd FROM roles WHERE name = 'MCD_OFFICER';
    SELECT id INTO v_role_sys FROM roles WHERE name = 'SYSTEM_ADMIN';

    -- 1. Synthetic Zone & Ward
    INSERT INTO mcd_zones (id, zone_code, zone_name)
    VALUES (v_zone_id, 'JUDGE-DEMO-ZONE', 'Judge Demonstration Municipal Zone')
    ON CONFLICT (zone_code) DO NOTHING;

    INSERT INTO mcd_wards (id, zone_id, ward_code, ward_name)
    VALUES (v_ward_id, v_zone_id, 'JUDGE-DEMO-WARD', 'Judge Demonstration Ward 42')
    ON CONFLICT (ward_code) DO NOTHING;

    -- 2. Synthetic Organizations
    INSERT INTO organizations (id, name, org_type, ward_id, address, contact_email, contact_phone)
    VALUES 
        (v_rwa_org_id, 'NirmalTag Judge Demo RWA', 'RWA', v_ward_id, 'Green Park Colony, Block A-C', 'demo-rwa@nirmaltag.org', '+919876500001'),
        (v_bwg_org_id, 'NirmalTag Judge Demo BWG', 'BWG', v_ward_id, 'Grand Park Hotel & Commercial Complex', 'demo-bwg@nirmaltag.org', '+919876500002'),
        (v_mcd_org_id, 'MCD Rohini Zone HQ', 'MCD', v_ward_id, 'Municipal Civic Center, Ward 42', 'mcd-ward42@nirmaltag.org', '+919876500003')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO rwas (org_id, rwa_registration_number, colony_name, total_households)
    VALUES (v_rwa_org_id, 'DEMO-RWA-2026-001', 'Green Park Colony', 12)
    ON CONFLICT (rwa_registration_number) DO NOTHING;

    INSERT INTO bwgs (org_id, facility_name, facility_type, daily_waste_volume_kg)
    VALUES (v_bwg_org_id, 'Grand Park Hotel & Suites', 'HOTEL', 87.50)
    ON CONFLICT (org_id) DO NOTHING;

    -- 3. Synthetic Profiles for 7 Canonical Roles
    -- Households
    INSERT INTO profiles (id, firebase_uid, email, full_name, phone_number) VALUES
        (v_hh1_id, 'DEMO_UID_HH_01', 'demo.household01@nirmaltag.org', 'Demo Household — Green Park A-101', '+919800000001'),
        (v_hh2_id, 'DEMO_UID_HH_02', 'demo.household02@nirmaltag.org', 'Demo Household — Green Park A-102', '+919800000002'),
        (v_hh3_id, 'DEMO_UID_HH_03', 'demo.household03@nirmaltag.org', 'Demo Household — Green Park B-201', '+919800000003'),
        (v_col_id, 'DEMO_UID_COL_01', 'demo.collector@nirmaltag.org', 'Demo Collector — Rahul Sharma', '+919800000021'),
        (v_tag_off_id, 'DEMO_UID_TAG_01', 'demo.tagofficer@nirmaltag.org', 'Demo Tag Officer — Ananya Verma', '+919800000022'),
        (v_rwa_admin_id, 'DEMO_UID_RWA_01', 'demo.rwaadmin@nirmaltag.org', 'Demo RWA Admin — Neha Singh', '+919800000023'),
        (v_bwg_admin_id, 'DEMO_UID_BWG_01', 'demo.bwgadmin@nirmaltag.org', 'Demo BWG Admin — Arjun Mehta', '+919800000024'),
        (v_mcd_off_id, 'DEMO_UID_MCD_01', 'demo.mcdofficer@nirmaltag.org', 'Demo MCD Officer — Priya Kapoor', '+919800000025'),
        (v_sys_admin_id, 'DEMO_UID_SYS_01', 'demo.sysadmin@nirmaltag.org', 'Demo System Admin — NirmalTag Operations', '+919800000026')
    ON CONFLICT (id) DO NOTHING;

    -- Assign User Roles
    INSERT INTO user_roles (user_id, role_id) VALUES
        (v_hh1_id, v_role_hh),
        (v_hh2_id, v_role_hh),
        (v_hh3_id, v_role_hh),
        (v_col_id, v_role_col),
        (v_tag_off_id, v_role_tag),
        (v_rwa_admin_id, v_role_rwa),
        (v_bwg_admin_id, v_role_bwg),
        (v_mcd_off_id, v_role_mcd),
        (v_sys_admin_id, v_role_sys)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Household Entity Records
    INSERT INTO households (id, user_id, org_id, address_line1, ward_id, pincode, credit_balance) VALUES
        (v_hh1_house_id, v_hh1_id, v_rwa_org_id, 'Green Park A-101', v_ward_id, '110085', 40),
        (v_hh2_house_id, v_hh2_id, v_rwa_org_id, 'Green Park A-102', v_ward_id, '110085', 20)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO credit_accounts (household_id, current_balance, total_earned, total_redeemed) VALUES
        (v_hh1_house_id, 40, 40, 0),
        (v_hh2_house_id, 20, 20, 0)
    ON CONFLICT (household_id) DO NOTHING;

    -- Collector Entity Record
    INSERT INTO collectors (id, user_id, org_id, assigned_ward_id, incentive_balance_inr, is_active) VALUES
        (v_collector_entity_id, v_col_id, v_rwa_org_id, v_ward_id, 30.00, TRUE)
    ON CONFLICT (user_id) DO NOTHING;

    -- Officer Profiles
    INSERT INTO officer_profiles (user_id, org_id, badge_number, assigned_scope, assigned_ward_id, assigned_zone_id) VALUES
        (v_tag_off_id, v_rwa_org_id, 'TAG-OFF-2026-99', 'WARD', v_ward_id, v_zone_id),
        (v_mcd_off_id, v_mcd_org_id, 'MCD-INSP-2026-42', 'ZONE', v_ward_id, v_zone_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. Waste Category
    SELECT id INTO v_category_id FROM waste_categories WHERE code = 'SANITARY';

    -- 5. Tag Batch
    INSERT INTO tag_batches (id, batch_number, manufacturer_name, waste_category_id, total_quantity, received_quantity, issuing_org_id, receiving_org_id, created_by)
    VALUES (v_batch_id, 'BATCH-JUDGE-DEMO-2026-01', 'NirmalTag EcoMaterials Ltd', v_category_id, 25, 25, v_mcd_org_id, v_rwa_org_id, v_tag_off_id)
    ON CONFLICT (batch_number) DO NOTHING;

    -- 6. Demo Tags
    -- Tag 1: Fresh ACTIVE Tag for Live Judge Camera QR Scan!
    INSERT INTO tags (id, canonical_code, qr_token, batch_id, waste_category_id, status, current_assigned_household_id, activated_at)
    VALUES ('40000000-0000-0000-0000-000000000001', 'NT-SAN-2026-917201', 'TOKEN-NT-SAN-2026-917201', v_batch_id, v_category_id, 'ACTIVE', v_hh1_house_id, NOW())
    ON CONFLICT (canonical_code) DO UPDATE SET status = 'ACTIVE';

    -- Additional Demo Tags across lifecycle states
    INSERT INTO tags (id, canonical_code, qr_token, batch_id, waste_category_id, status, current_assigned_household_id, activated_at, closed_at) VALUES
        ('40000000-0000-0000-0000-000000000002', 'NT-SAN-2026-917202', 'TOKEN-NT-SAN-2026-917202', v_batch_id, v_category_id, 'CLOSED', v_hh1_house_id, NOW() - interval '2 days', NOW() - interval '1 day'),
        ('40000000-0000-0000-0000-000000000003', 'NT-SAN-2026-917203', 'TOKEN-NT-SAN-2026-917203', v_batch_id, v_category_id, 'CLOSED', v_hh1_house_id, NOW() - interval '4 days', NOW() - interval '3 days'),
        ('40000000-0000-0000-0000-000000000004', 'NT-SAN-2026-917204', 'TOKEN-NT-SAN-2026-917204', v_batch_id, v_category_id, 'ASSIGNED', v_hh2_house_id, NULL, NULL),
        ('40000000-0000-0000-0000-000000000005', 'NT-SAN-2026-917205', 'TOKEN-NT-SAN-2026-917205', v_batch_id, v_category_id, 'IN_INVENTORY', NULL, NULL, NULL),
        ('40000000-0000-0000-0000-000000000006', 'NT-SAN-2026-917206', 'TOKEN-NT-SAN-2026-917206', v_batch_id, v_category_id, 'REGISTERED', NULL, NULL, NULL)
    ON CONFLICT (canonical_code) DO NOTHING;

    -- 7. Verified Pickups for History
    INSERT INTO pickups (id, tag_id, collector_id, household_id, status, scan_timestamp, evidence_timestamp, idempotency_key) VALUES
        ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', v_collector_entity_id, v_hh1_house_id, 'VERIFIED', NOW() - interval '1 day', NOW() - interval '1 day', 'SYNC-DEMO-PICKUP-001'),
        ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', v_collector_entity_id, v_hh1_house_id, 'VERIFIED', NOW() - interval '3 days', NOW() - interval '3 days', 'SYNC-DEMO-PICKUP-002')
    ON CONFLICT (idempotency_key) DO NOTHING;

END $$;
