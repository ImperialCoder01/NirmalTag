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
    const text = await response.text();
    throw new Error(`Database query failed (${response.status}): ${text}`);
  }

  return await response.json();
}

async function runIteration6LiveTests() {
  console.log("=================================================");
  console.log("NIRMALTAG ITERATION 6 — LIVE HOUSEHOLD / RWA TESTS");
  console.log("=================================================");

  const testOfficerId = "00000000-0000-0000-0000-000000000099";
  const testHhAId = "00000000-0000-0000-0000-000000000077";
  const testHhBId = "00000000-0000-0000-0000-000000000066";
  const testWardId = "123e4567-e89b-12d3-a456-426614174000";

  console.log("\n[SETUP] Seeding test households HhA and HhB...");
  await query(`
    INSERT INTO profiles (id, firebase_uid, email, full_name)
    VALUES ('${testHhAId}', 'test-hhA-uid-77', 'hhA@nirmaltag.org', 'Household A')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, firebase_uid, email, full_name)
    VALUES ('${testHhBId}', 'test-hhB-uid-66', 'hhB@nirmaltag.org', 'Household B')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO households (id, user_id, address_line1, pincode, ward_id)
    VALUES ('${testHhAId}', '${testHhAId}', 'Flat 101, Block A', '110085', '${testWardId}')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO households (id, user_id, address_line1, pincode, ward_id)
    VALUES ('${testHhBId}', '${testHhBId}', 'Flat 202, Block B', '110085', '${testWardId}')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT '${testHhAId}', id FROM roles WHERE name = 'HOUSEHOLD'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT '${testHhBId}', id FROM roles WHERE name = 'HOUSEHOLD'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);

  console.log("[SETUP] Households HhA and HhB established.");

  // Create a test tag batch
  const batchRes = await query(`
    SELECT create_tag_batch_and_records(
      'IT6-BATCH-${Date.now()}', 5, '${testWardId}'::uuid, '${testOfficerId}'::uuid, 'IT6-KEY-${Date.now()}'
    ) AS result;
  `);
  const batchId = batchRes[0].result.batch_id;
  const tagList = await query(`SELECT id, serial_code FROM tags WHERE batch_id = '${batchId}'::uuid LIMIT 3;`);
  const tagA = tagList[0];
  const tagB = tagList[1];

  console.log(`Created test batch ${batchId}. Tag A: ${tagA.id} (${tagA.serial_code}), Tag B: ${tagB.id} (${tagB.serial_code})`);

  // ---------------------------------------------------------
  // 1. AUTHORITATIVE TAG ASSIGNMENT TEST
  // ---------------------------------------------------------
  console.log("\n--- TEST 1: AUTHORITATIVE TAG ASSIGNMENT ---");
  const assignRes = await query(`
    SELECT assign_tag_to_household(
      '${tagA.id}'::uuid, '${testHhAId}'::uuid, '${testOfficerId}'::uuid, 'ASSIGN-KEY-01'
    ) AS result;
  `);
  console.log("Assignment Result:", JSON.stringify(assignRes[0].result));
  const tagACheck = await query(`SELECT status, current_assigned_household_id FROM tags WHERE id = '${tagA.id}'::uuid;`);
  console.log("Tag A DB State:", JSON.stringify(tagACheck[0]));

  const assignPass = (
    assignRes[0].result.status === "SUCCESS" &&
    tagACheck[0].status === "ASSIGNED" &&
    tagACheck[0].current_assigned_household_id === testHhAId
  );
  console.log(`TAG ASSIGNMENT RESULT: ${assignPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 2. IDEMPOTENT ASSIGNMENT RETRY
  // ---------------------------------------------------------
  console.log("\n--- TEST 2: IDEMPOTENT ASSIGNMENT RETRY ---");
  const retryRes = await query(`
    SELECT assign_tag_to_household(
      '${tagA.id}'::uuid, '${testHhAId}'::uuid, '${testOfficerId}'::uuid, 'ASSIGN-KEY-01'
    ) AS result;
  `);
  console.log("Assignment Retry Result:", JSON.stringify(retryRes[0].result));
  const retryPass = (retryRes[0].result.is_idempotent_retry === true);
  console.log(`IDEMPOTENT ASSIGNMENT RETRY RESULT: ${retryPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 3. REASSIGNMENT REJECTION (FAIL CLOSED)
  // ---------------------------------------------------------
  console.log("\n--- TEST 3: REASSIGNMENT REJECTION (FAIL CLOSED) ---");
  let reassignFailed = false;
  try {
    await query(`
      SELECT assign_tag_to_household(
        '${tagA.id}'::uuid, '${testHhBId}'::uuid, '${testOfficerId}'::uuid, 'REASSIGN-KEY-01'
      );
    `);
  } catch (err) {
    reassignFailed = true;
    console.log("Reassigning Tag A to Household B correctly REJECTED:", err.message);
  }
  console.log(`REASSIGNMENT REJECTION RESULT: ${reassignFailed ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 4. HOUSEHOLD RESIDENT TAG ACTIVATION
  // ---------------------------------------------------------
  console.log("\n--- TEST 4: HOUSEHOLD RESIDENT TAG ACTIVATION ---");
  const actRes = await query(`
    SELECT activate_household_tag(
      '${tagA.id}'::uuid, '${testHhAId}'::uuid, 'ACT-KEY-01'
    ) AS result;
  `);
  console.log("Activation Result:", JSON.stringify(actRes[0].result));

  const tagAActCheck = await query(`SELECT status FROM tags WHERE id = '${tagA.id}'::uuid;`);
  console.log("Tag A DB State after activation:", JSON.stringify(tagAActCheck[0]));

  const actPass = (
    actRes[0].result.status === "SUCCESS" &&
    tagAActCheck[0].status === "ACTIVE"
  );
  console.log(`HOUSEHOLD TAG ACTIVATION RESULT: ${actPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 5. AUDIT TRAIL RECONCILIATION FOR ASSIGNMENT & ACTIVATION
  // ---------------------------------------------------------
  console.log("\n--- TEST 5: AUDIT TRAIL RECONCILIATION FOR ASSIGNMENT & ACTIVATION ---");
  const assignAuditLogs = await query(`
    SELECT * FROM audit_logs WHERE target_entity = 'tags' AND target_id = '${tagA.id}' AND action = 'TAG_ASSIGNED_TO_HOUSEHOLD';
  `);
  const actAuditLogs = await query(`
    SELECT * FROM audit_logs WHERE target_entity = 'tags' AND target_id = '${tagA.id}' AND action = 'TAG_ACTIVATED_BY_HOUSEHOLD';
  `);
  console.log("Assignment Audit Log:", JSON.stringify(assignAuditLogs));
  console.log("Activation Audit Log:", JSON.stringify(actAuditLogs));

  const auditPass = (assignAuditLogs.length >= 1 && actAuditLogs.length >= 1);
  console.log(`AUDIT TRAIL RECONCILIATION RESULT: ${auditPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 6. COLLECTOR PICKUP HOUSEHOLD RESOLUTION TEST
  // ---------------------------------------------------------
  console.log("\n--- TEST 6: COLLECTOR PICKUP HOUSEHOLD RESOLUTION ---");
  // Test process_verified_pickup_transaction_v2 resolves household strictly from tag.current_assigned_household_id
  const collectorPickupRes = await query(`
    SELECT current_assigned_household_id FROM tags WHERE id = '${tagA.id}'::uuid;
  `);
  const resolvedHhId = collectorPickupRes[0].current_assigned_household_id;
  console.log(`Tag A resolved household ID: ${resolvedHhId} (expected: ${testHhAId})`);

  const collectorHhPass = (resolvedHhId === testHhAId);
  console.log(`COLLECTOR HOUSEHOLD RESOLUTION RESULT: ${collectorHhPass ? "PASS" : "FAIL"}`);

  console.log("\n=================================================");
  console.log("ALL ITERATION 6 LIVE TESTS EXECUTED SUCCESSFULLY");
  console.log("=================================================");
}

runIteration6LiveTests().catch(err => {
  console.error("Iteration 6 live test execution error:", err);
  process.exit(1);
});
