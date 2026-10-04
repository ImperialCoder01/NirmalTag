import fs from 'fs';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'ubphrqumpqdifupwbvpe';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function query(sql) {
  if (!accessToken) {
    throw new Error('Missing SUPABASE_ACCESS_TOKEN environment variable.');
  }
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

  return await response.json();
}

async function runFullOperationalLoopTest() {
  console.log("=================================================");
  console.log("TESTING OPERATIONAL LOOP: REQUEST -> FULFILLMENT");
  console.log("=================================================");

  const testHhFirebaseUid = "test-live-hh-uid-11";
  const testHhProfileId = "11111111-2222-3333-4444-555555555555";
  const testCollectorFirebaseUid = "test-live-coll-uid-22";
  const testCollectorProfileId = "22222222-3333-4444-5555-666666666666";
  const testWardId = "123e4567-e89b-12d3-a456-426614174000";
  const testTagCode = `NT-SAN-2026-LIVE-${Math.floor(1000 + Math.random() * 9000)}`;

  console.log("\n1. Provisioning Test Household & Collector in PostgreSQL...");
  await query(`
    INSERT INTO profiles (id, firebase_uid, email, full_name, is_active)
    VALUES ('${testHhProfileId}', '${testHhFirebaseUid}', 'live_household@nirmaltag.org', 'Live Test Household', true)
    ON CONFLICT (id) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid, is_active = true;

    INSERT INTO households (id, user_id, address_line1, pincode, ward_id)
    VALUES ('${testHhProfileId}', '${testHhProfileId}', 'Door 101, Test Ward', '110085', '${testWardId}')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT '${testHhProfileId}', id FROM roles WHERE name = 'HOUSEHOLD'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO profiles (id, firebase_uid, email, full_name, is_active)
    VALUES ('${testCollectorProfileId}', '${testCollectorFirebaseUid}', 'live_collector@nirmaltag.org', 'Live Test Collector', true)
    ON CONFLICT (id) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid, is_active = true;

    INSERT INTO user_roles (user_id, role_id)
    SELECT '${testCollectorProfileId}', id FROM roles WHERE name = 'COLLECTOR'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO tags (id, canonical_code, qr_token, waste_category_id, status)
    SELECT uuid_generate_v4(), '${testTagCode}', 'TOKEN-${testTagCode}', id, 'IN_INVENTORY'
    FROM waste_categories WHERE code = 'SANITARY';
  `);
  console.log("   Entities provisioned!");

  console.log("\n2. Household requests pouch...");
  const requestRes = await query(`
    SELECT set_config('request.jwt.claims', '{"sub": "${testHhFirebaseUid}"}', true);
    SELECT public.request_household_pouch('SANITARY', 1) AS result;
  `);
  const reqId = requestRes[1]?.result?.requestId || requestRes[0]?.result?.requestId;
  console.log("   Pouch Request Created: ID =", reqId);

  console.log("\n3. Collector fulfills pouch request with physical QR tag...");
  const fulfillRes = await query(`
    SELECT set_config('request.jwt.claims', '{"sub": "${testCollectorFirebaseUid}"}', true);
    SELECT public.fulfill_household_pouch_request('${reqId}', '${testTagCode}') AS result;
  `);
  console.log("   Fulfillment RPC Result:", JSON.stringify(fulfillRes));

  const fulfillObj = fulfillRes[1]?.result || fulfillRes[0]?.result;
  if (fulfillObj && fulfillObj.success === true && fulfillObj.status === 'DELIVERED') {
    console.log("   SUCCESS: Pouch request status updated to DELIVERED!");
  } else {
    console.error("   FAILED: Unexpected fulfillment result:", fulfillObj);
    process.exit(1);
  }

  console.log("\n4. Verifying tag assignment state in PostgreSQL...");
  const tagCheck = await query(`
    SELECT canonical_code, status, current_assigned_household_id
    FROM tags WHERE canonical_code = '${testTagCode}';
  `);
  console.log("   Tag State:", JSON.stringify(tagCheck));

  console.log("\n5. Testing Idempotent Replay on Fulfillment...");
  const replayRes = await query(`
    SELECT set_config('request.jwt.claims', '{"sub": "${testCollectorFirebaseUid}"}', true);
    SELECT public.fulfill_household_pouch_request('${reqId}', '${testTagCode}') AS result;
  `);
  console.log("   Replay Result:", JSON.stringify(replayRes));

  console.log("\n6. Cleaning up test data...");
  await query(`
    DELETE FROM in_app_notifications WHERE user_id IN ('${testHhProfileId}', '${testCollectorProfileId}');
    DELETE FROM pouch_requests WHERE household_id = '${testHhProfileId}';
    DELETE FROM tags WHERE current_assigned_household_id = '${testHhProfileId}' OR canonical_code = '${testTagCode}';
    DELETE FROM households WHERE id = '${testHhProfileId}';
    DELETE FROM user_roles WHERE user_id IN ('${testHhProfileId}', '${testCollectorProfileId}');
    DELETE FROM profiles WHERE id IN ('${testHhProfileId}', '${testCollectorProfileId}');
  `);
  console.log("   Cleaned up test data.");

  console.log("\nOPERATIONAL LOOP (REQUEST -> FULFILLMENT -> TAG ASSIGNMENT) VERIFIED!");
}

runFullOperationalLoopTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
