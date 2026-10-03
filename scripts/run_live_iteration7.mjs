const projectRef = process.env.SUPABASE_PROJECT_REF || 'ubphrqumpqdifupwbvpe';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN environment variable.');
  process.exit(1);
}

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Database query failed (${response.status}): ${errText}`);
  }

  return response.json();
}

async function runLiveIteration7Tests() {
  console.log('====================================================');
  console.log('NIRMALTAG — ITERATION 7 LIVE SUPABASE DB TEST SUITE');
  console.log('====================================================\n');

  try {
    // SETUP TEST FIXTURES
    const tagOfficerUid = '00000000-0000-0000-0000-000000000099';
    const collectorUid = '00000000-0000-0000-0000-000000000088';
    const householdAUid = '00000000-0000-0000-0000-000000000077';
    const householdBUid = '00000000-0000-0000-0000-000000000066';
    const fakeHouseholdUid = '00000000-0000-0000-0000-000000000055';

    console.log('Step 0: Provisioning roles and test entities...');
    await query(`
      -- Roles
      INSERT INTO user_roles (user_id, role_id)
      SELECT '${tagOfficerUid}', id FROM roles WHERE name = 'TAG_OFFICER'
      ON CONFLICT DO NOTHING;

      INSERT INTO user_roles (user_id, role_id)
      SELECT '${collectorUid}', id FROM roles WHERE name = 'COLLECTOR'
      ON CONFLICT DO NOTHING;

      INSERT INTO user_roles (user_id, role_id)
      SELECT '${householdAUid}', id FROM roles WHERE name = 'HOUSEHOLD'
      ON CONFLICT DO NOTHING;

      INSERT INTO user_roles (user_id, role_id)
      SELECT '${householdBUid}', id FROM roles WHERE name = 'HOUSEHOLD'
      ON CONFLICT DO NOTHING;

      -- Ward
      INSERT INTO mcd_wards (id, ward_name, ward_code)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Live Test Ward Iteration 7', 'WARD-777')
      ON CONFLICT DO NOTHING;

      -- Households
      INSERT INTO households (id, user_id, ward_id, address_line1, pincode)
      VALUES 
        ('00000000-0000-0000-0000-000000000077', '${householdAUid}', '00000000-0000-0000-0000-000000000001', 'Household A Test Flat 101', '110001'),
        ('00000000-0000-0000-0000-000000000066', '${householdBUid}', '00000000-0000-0000-0000-000000000001', 'Household B Test Flat 102', '110001')
      ON CONFLICT DO NOTHING;

      -- Reward Policies
      INSERT INTO reward_policies (key, value, description)
      VALUES 
        ('HOUSEHOLD_CREDIT_PER_PICKUP', 10.0, 'Points per pickup'),
        ('COLLECTOR_INCENTIVE_PER_PICKUP', 2.0, 'Points per pickup handling')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `);

    // TEST 1: Unauthenticated pickup request REJECTED
    console.log('\n--- LIVE DB TEST 1: Unauthenticated pickup transaction REJECTED ---');
    let t1Passed = false;
    try {
      await query(`SELECT process_verified_pickup_transaction_v2('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NULL, 'IDEMP-T1');`);
    } catch (err) {
      if (err.message.includes('42501') || err.message.includes('Unauthenticated')) {
        console.log('✔ PASS: Unauthenticated pickup transaction rejected with 42501.');
        t1Passed = true;
      }
    }
    if (!t1Passed) throw new Error('TEST 1 FAILED: Unauthenticated pickup was not rejected.');

    // TEST 2: Non-collector role calling pickup transaction REJECTED
    console.log('\n--- LIVE DB TEST 2: Non-collector account (HOUSEHOLD) calling RPC REJECTED ---');
    let t2Passed = false;
    try {
      await query(`SELECT process_verified_pickup_transaction_v2('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '${householdAUid}', 'IDEMP-T2');`);
    } catch (err) {
      if (err.message.includes('42501') || err.message.includes('not an authorized COLLECTOR')) {
        console.log('✔ PASS: HOUSEHOLD role calling pickup transaction rejected with 42501.');
        t2Passed = true;
      }
    }
    if (!t2Passed) throw new Error('TEST 2 FAILED: HOUSEHOLD calling pickup was not rejected.');

    // Provision test tag & pickup record for Household A
    const tagId1 = '00000000-0000-0000-0000-000000000111';
    const pickupId1 = '00000000-0000-0000-0000-000000000222';
    const runNonce = Date.now();
    const idempotencyKey1 = `IDEMP-LIVE-777-${runNonce}`;

    await query(`
      INSERT INTO tags (id, canonical_code, qr_token, current_assigned_household_id, status)
      VALUES ('${tagId1}', 'TAG-ACTIVE-001', 'QR-ACT-001', '00000000-0000-0000-0000-000000000077', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', current_assigned_household_id = '00000000-0000-0000-0000-000000000077';

      DELETE FROM credit_transactions WHERE pickup_id = '${pickupId1}';
      DELETE FROM collector_incentive_transactions WHERE pickup_id = '${pickupId1}';
      DELETE FROM pickups WHERE id = '${pickupId1}';

      INSERT INTO pickups (id, tag_id, collector_id, household_id, status, scan_timestamp, evidence_timestamp, idempotency_key)
      VALUES ('${pickupId1}', '${tagId1}', NULL, '00000000-0000-0000-0000-000000000077', 'PENDING', NOW(), NOW(), '${idempotencyKey1}');
    `);

    // TEST 3: Valid Pickup Transaction Finalization
    console.log('\n--- LIVE DB TEST 3: Valid Pickup Finalization (ACTIVE -> CLOSED + Household & Collector Credits) ---');
    const t3Res = await query(`
      SELECT process_verified_pickup_transaction_v2(
        '${pickupId1}',
        '${tagId1}',
        '${collectorUid}',
        '${idempotencyKey1}'
      ) as result;
    `);
    const t3Obj = t3Res[0].result;
    console.log('Pickup Finalization Result:', t3Obj);
    if (t3Obj.status !== 'SUCCESS' || t3Obj.household_balance < 10.0 || t3Obj.collector_balance < 2.0) {
      throw new Error('TEST 3 FAILED: Valid pickup transaction did not return SUCCESS with correct balances.');
    }
    console.log('✔ PASS: Valid pickup finalization executed successfully.');

    // TEST 4: Duplicate Retry Return ALREADY_PROCESSED (Idempotency)
    console.log('\n--- LIVE DB TEST 4: Duplicate Retry Returns ALREADY_PROCESSED ---');
    const t4Res = await query(`
      SELECT process_verified_pickup_transaction_v2(
        '${pickupId1}',
        '${tagId1}',
        '${collectorUid}',
        '${idempotencyKey1}'
      ) as result;
    `);
    const t4Obj = t4Res[0].result;
    console.log('Duplicate Retry Result:', t4Obj);
    if (t4Obj.status !== 'ALREADY_PROCESSED') {
      throw new Error('TEST 4 FAILED: Duplicate request did not return ALREADY_PROCESSED.');
    }
    console.log('✔ PASS: Duplicate retry was handled idempotently without double crediting.');

    // TEST 5: Closed Tag Pickup Rejection
    console.log('\n--- LIVE DB TEST 5: Pickup on CLOSED tag REJECTED ---');
    let t5Passed = false;
    const pickupId2 = '00000000-0000-0000-0000-000000000333';
    await query(`
      INSERT INTO pickups (id, tag_id, collector_id, household_id, status, scan_timestamp, evidence_timestamp, idempotency_key)
      VALUES ('${pickupId2}', '${tagId1}', NULL, '00000000-0000-0000-0000-000000000077', 'PENDING', NOW(), NOW(), 'IDEMP-CLOSED-TEST')
      ON CONFLICT (id) DO NOTHING;
    `);
    try {
      await query(`
        SELECT process_verified_pickup_transaction_v2(
          '${pickupId2}',
          '${tagId1}',
          '${collectorUid}',
          'IDEMP-CLOSED-TEST'
        );
      `);
    } catch (err) {
      if (err.message.includes('42P01') || err.message.includes('not eligible for pickup finalization')) {
        console.log('✔ PASS: Attempting pickup on CLOSED tag was rejected.');
        t5Passed = true;
      }
    }
    if (!t5Passed) throw new Error('TEST 5 FAILED: Closed tag pickup was not rejected.');

    // TEST 6: Ineligible Tag Status (ASSIGNED tag) REJECTED
    console.log('\n--- LIVE DB TEST 6: Pickup on ASSIGNED tag REJECTED ---');
    const tagIdAssigned = '00000000-0000-0000-0000-000000000444';
    const pickupIdAssigned = '00000000-0000-0000-0000-000000000555';
    await query(`
      INSERT INTO tags (id, canonical_code, qr_token, current_assigned_household_id, status)
      VALUES ('${tagIdAssigned}', 'TAG-ASSIGNED-001', 'QR-ASS-001', '00000000-0000-0000-0000-000000000077', 'ASSIGNED')
      ON CONFLICT (id) DO UPDATE SET status = 'ASSIGNED';

      INSERT INTO pickups (id, tag_id, collector_id, household_id, status, scan_timestamp, evidence_timestamp, idempotency_key)
      VALUES ('${pickupIdAssigned}', '${tagIdAssigned}', NULL, '00000000-0000-0000-0000-000000000077', 'PENDING', NOW(), NOW(), 'IDEMP-ASS-TEST')
      ON CONFLICT (id) DO NOTHING;
    `);
    let t6Passed = false;
    try {
      await query(`
        SELECT process_verified_pickup_transaction_v2(
          '${pickupIdAssigned}',
          '${tagIdAssigned}',
          '${collectorUid}',
          'IDEMP-ASS-TEST'
        );
      `);
    } catch (err) {
      if (err.message.includes('42P01') || err.message.includes('not eligible for pickup finalization')) {
        console.log('✔ PASS: Attempting pickup on ASSIGNED tag was rejected.');
        t6Passed = true;
      }
    }
    if (!t6Passed) throw new Error('TEST 6 FAILED: Pickup on ASSIGNED tag was not rejected.');

    // TEST 7: Ledger Reconciliation Verification
    console.log('\n--- LIVE DB TEST 7: Ledger Reconciliation Audit ---');
    const ledgerAudit = await query(`
      SELECT 
        (SELECT COUNT(*) FROM credit_transactions WHERE pickup_id = '${pickupId1}') as household_tx_count,
        (SELECT COUNT(*) FROM collector_incentive_transactions WHERE pickup_id = '${pickupId1}') as collector_tx_count,
        (SELECT status FROM tags WHERE id = '${tagId1}') as tag_final_status;
    `);
    console.log('Ledger audit query result:', ledgerAudit[0]);
    if (Number(ledgerAudit[0].household_tx_count) !== 1 || Number(ledgerAudit[0].collector_tx_count) !== 1 || ledgerAudit[0].tag_final_status !== 'CLOSED') {
      throw new Error('TEST 7 FAILED: Ledger reconciliation failed.');
    }
    console.log('✔ PASS: Ledger transactions strictly match (1 household earn + 1 collector incentive + tag CLOSED).');

    console.log('\n====================================================');
    console.log('ALL LIVE SUPABASE DB ITERATION 7 TESTS PASSED!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ LIVE DB TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
}

runLiveIteration7Tests();
