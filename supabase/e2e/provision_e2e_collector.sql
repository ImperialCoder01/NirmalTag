BEGIN;

-- 1. GEOGRAPHIC & MUNICIPAL FIXTURES
INSERT INTO mcd_zones (id, zone_code, zone_name)
VALUES ('00000000-0000-4000-a000-000000000099', 'ZONE_E2E_TEST', 'E2E Test MCD Zone')
ON CONFLICT (zone_code) DO NOTHING;

INSERT INTO mcd_wards (id, zone_id, ward_code, ward_name)
VALUES ('00000000-0000-4000-a000-000000000098', '00000000-0000-4000-a000-000000000099', 'WARD_E2E_TEST', 'E2E Test MCD Ward 99')
ON CONFLICT (ward_code) DO NOTHING;

INSERT INTO organizations (id, name, org_type, ward_id, address, contact_email)
VALUES ('00000000-0000-4000-a000-000000000097', 'E2E_TEST_RWA_ORG', 'RWA', '00000000-0000-4000-a000-000000000098', 'E2E Test Colony Address', 'e2e-test-rwa@nirmaltag.org')
ON CONFLICT DO NOTHING;

-- 2. FIREBASE COLLECTOR IDENTITY & ROLE FIXTURES
INSERT INTO profiles (id, firebase_uid, email, full_name, is_active, mfa_enabled)
VALUES (
    '00000000-0000-4000-a000-000000000096',
    'X6k87mpP00gxkNq8yKn5b8laFvo1',
    'nirmaltag.e2e.collector@gmail.com',
    'E2E Test Waste Collector',
    TRUE,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid, email = EXCLUDED.email;

INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-4000-a000-000000000096', id
FROM roles WHERE name = 'COLLECTOR'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO collectors (id, user_id, org_id, assigned_ward_id, is_active)
VALUES (
    '00000000-0000-4000-a000-000000000095',
    '00000000-0000-4000-a000-000000000096',
    '00000000-0000-4000-a000-000000000097',
    '00000000-0000-4000-a000-000000000098',
    TRUE
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. TAG OFFICER & HOUSEHOLD RESIDENT FIXTURES
INSERT INTO profiles (id, firebase_uid, email, full_name, is_active, mfa_enabled)
VALUES (
    '00000000-0000-4000-a000-000000000092',
    'e2e_officer_uid_test_01',
    'e2e.officer.test@nirmaltag.org',
    'E2E Test Tag Officer',
    TRUE,
    FALSE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-4000-a000-000000000092', id
FROM roles WHERE name = 'TAG_OFFICER'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO profiles (id, firebase_uid, email, full_name, is_active, mfa_enabled)
VALUES (
    '00000000-0000-4000-a000-000000000094',
    'e2e_resident_uid_test_01',
    'e2e.resident.test@nirmaltag.org',
    'E2E Test Resident',
    TRUE,
    FALSE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-4000-a000-000000000094', id
FROM roles WHERE name = 'HOUSEHOLD'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO households (id, user_id, org_id, address_line1, ward_id, pincode, credit_balance)
VALUES (
    '00000000-0000-4000-a000-000000000093',
    '00000000-0000-4000-a000-000000000094',
    '00000000-0000-4000-a000-000000000097',
    'Flat E2E-101, E2E Test Colony',
    '00000000-0000-4000-a000-000000000098',
    '110016',
    0
)
ON CONFLICT (user_id) DO NOTHING;

-- 4. AUTHORITATIVE TAG SUPPLY CHAIN & LIFECYCLE (RUN-SPECIFIC ACTIVE TAG)
SELECT create_tag_batch_and_records(
    'BATCH-E2E-TEST-001',
    1,
    '00000000-0000-4000-a000-000000000098',
    '00000000-0000-4000-a000-000000000092',
    'IDEMP-BATCH-E2E-001'
);

SELECT assign_tag_to_household(
    (SELECT t.id FROM tags t JOIN tag_batches b ON t.batch_id = b.id WHERE b.batch_number = 'BATCH-E2E-TEST-001' ORDER BY t.created_at DESC LIMIT 1),
    '00000000-0000-4000-a000-000000000093',
    '00000000-0000-4000-a000-000000000092',
    'IDEMP-ASSIGN-E2E-001'
);

SELECT activate_household_tag(
    (SELECT t.id FROM tags t JOIN tag_batches b ON t.batch_id = b.id WHERE b.batch_number = 'BATCH-E2E-TEST-001' ORDER BY t.created_at DESC LIMIT 1),
    '00000000-0000-4000-a000-000000000094',
    'IDEMP-ACTIVATE-E2E-001'
);

COMMIT;
