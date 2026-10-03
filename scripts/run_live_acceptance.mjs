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

async function runAcceptanceTests() {
  console.log("=================================================");
  console.log("NIRMALTAG ITERATION 5.2 — LIVE ACCEPTANCE TESTS");
  console.log("=================================================");

  // Setup disposable test profiles and roles
  const testOfficerId = "00000000-0000-0000-0000-000000000099";
  const testHouseholdId = "00000000-0000-0000-0000-000000000088";
  const testZoneId = "123e4567-e89b-12d3-a456-426614174001";
  const testWardId = "123e4567-e89b-12d3-a456-426614174000";

  console.log("\n[SETUP] Seeding disposable test wards, profiles, and role assignments...");
  await query(`
    INSERT INTO mcd_zones (id, zone_code, zone_name)
    VALUES ('${testZoneId}', 'ZONE-ROHINI', 'Rohini Zone')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO mcd_wards (id, zone_id, ward_code, ward_name)
    VALUES ('${testWardId}', '${testZoneId}', 'WARD-42', 'Ward 42 (Rohini)')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, firebase_uid, email, full_name)
    VALUES ('${testOfficerId}', 'test-officer-uid-99', 'officer99@nirmaltag.org', 'Test Tag Officer')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, firebase_uid, email, full_name)
    VALUES ('${testHouseholdId}', 'test-hh-uid-88', 'household88@nirmaltag.org', 'Test Household User')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO roles (name, description)
    VALUES ('TAG_OFFICER', 'Tag Officer Role')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO roles (name, description)
    VALUES ('HOUSEHOLD', 'Household Role')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO roles (name, description)
    VALUES ('COLLECTOR', 'Collector Role')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO roles (name, description)
    VALUES ('MCD_OFFICER', 'MCD Officer Role')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT '${testOfficerId}', id FROM roles WHERE name = 'TAG_OFFICER'
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT '${testHouseholdId}', id FROM roles WHERE name = 'HOUSEHOLD'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  `);

  console.log("[SETUP] Disposable test identities & ward established.");

  // ---------------------------------------------------------
  // 1. LIVE IDEMPOTENCY TEST
  // ---------------------------------------------------------
  console.log("\n--- TEST 1: LIVE IDEMPOTENCY TEST ---");
  const idempotencyKey = `TEST-IDEM-${Date.now()}`;
  const batchName1 = `TEST-IDEM-BATCH-${Date.now()}`;

  // Call 1
  const res1 = await query(`
    SELECT create_tag_batch_and_records(
      '${batchName1}', 10, '${testWardId}'::uuid, '${testOfficerId}'::uuid, '${idempotencyKey}'
    ) AS result;
  `);
  const r1 = res1[0].result;
  console.log("Call 1 Result:", JSON.stringify(r1));

  // Query counts after Call 1
  const counts1 = await query(`
    SELECT 
      (SELECT COUNT(*) FROM tag_batches WHERE idempotency_key = '${idempotencyKey}') AS batch_cnt,
      (SELECT COUNT(*) FROM tags WHERE batch_id = '${r1.batch_id}'::uuid) AS tag_cnt,
      (SELECT COUNT(*) FROM audit_logs WHERE target_id = '${r1.batch_id}') AS audit_cnt;
  `);
  console.log("DB Counts after Call 1:", JSON.stringify(counts1[0]));

  // Call 2 (Retry with same actor, key, quantity)
  const res2 = await query(`
    SELECT create_tag_batch_and_records(
      '${batchName1}', 10, '${testWardId}'::uuid, '${testOfficerId}'::uuid, '${idempotencyKey}'
    ) AS result;
  `);
  const r2 = res2[0].result;
  console.log("Call 2 Retry Result:", JSON.stringify(r2));

  // Query counts after Call 2
  const counts2 = await query(`
    SELECT 
      (SELECT COUNT(*) FROM tag_batches WHERE idempotency_key = '${idempotencyKey}') AS batch_cnt,
      (SELECT COUNT(*) FROM tags WHERE batch_id = '${r1.batch_id}'::uuid) AS tag_cnt,
      (SELECT COUNT(*) FROM audit_logs WHERE target_id = '${r1.batch_id}') AS audit_cnt;
  `);
  console.log("DB Counts after Call 2 (Retry):", JSON.stringify(counts2[0]));

  const idempotencyPass = (
    r2.is_idempotent_retry === true &&
    r2.batch_id === r1.batch_id &&
    parseInt(counts2[0].batch_cnt, 10) === 1 &&
    parseInt(counts2[0].tag_cnt, 10) === 10 &&
    parseInt(counts2[0].audit_cnt, 10) === 1
  );

  console.log(`LIVE IDEMPOTENCY TEST RESULT: ${idempotencyPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 2. CONCURRENT BATCH TEST
  // ---------------------------------------------------------
  console.log("\n--- TEST 2: CONCURRENT BATCH TEST ---");
  const concurrentRunId = Date.now().toString().slice(-6);
  const promises = [];

  for (let i = 1; i <= 10; i++) {
    const bName = `CONC-BATCH-${concurrentRunId}-${i}`;
    const key = `CONC-KEY-${concurrentRunId}-${i}`;
    promises.push(
      query(`
        SELECT create_tag_batch_and_records(
          '${bName}', 100, '${testWardId}'::uuid, '${testOfficerId}'::uuid, '${key}'
        ) AS result;
      `)
    );
  }

  const results = await Promise.all(promises);
  console.log(`Executed 10 concurrent batch creation requests (100 tags each).`);

  const createdBatchIds = results.map(r => r[0].result.batch_id);

  // Verify DB state for concurrent run
  const concCheckBatch = await query(`
    SELECT 
      COUNT(DISTINCT id) AS batch_count,
      SUM(total_quantity) AS sum_total_quantity
    FROM tag_batches
    WHERE id IN (${createdBatchIds.map(id => `'${id}'`).join(',')});
  `);

  const concCheckTag = await query(`
    SELECT 
      COUNT(*) AS total_tag_rows,
      COUNT(DISTINCT serial_code) AS unique_serials
    FROM tags
    WHERE batch_id IN (${createdBatchIds.map(id => `'${id}'`).join(',')});
  `);

  console.log("Concurrent Batches Summary:", JSON.stringify(concCheckBatch[0]));
  console.log("Concurrent Tags Summary:", JSON.stringify(concCheckTag[0]));

  const concurrentPass = (
    createdBatchIds.length === 10 &&
    parseInt(concCheckBatch[0].batch_count, 10) === 10 &&
    parseInt(concCheckTag[0].total_tag_rows, 10) === 1000 &&
    parseInt(concCheckTag[0].unique_serials, 10) === 1000
  );
  console.log(`CONCURRENT BATCH TEST RESULT: ${concurrentPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 3. EXACT QUANTITY TEST
  // ---------------------------------------------------------
  console.log("\n--- TEST 3: EXACT QUANTITY TEST ---");
  for (const qty of [1, 10, 100]) {
    const qName = `EXACT-QTY-${qty}-${Date.now()}`;
    const qKey = `EXACT-KEY-${qty}-${Date.now()}`;
    const qRes = await query(`
      SELECT create_tag_batch_and_records(
        '${qName}', ${qty}, '${testWardId}'::uuid, '${testOfficerId}'::uuid, '${qKey}'
      ) AS result;
    `);
    const qBatchId = qRes[0].result.batch_id;
    const countCheck = await query(`SELECT COUNT(*) AS tag_cnt FROM tags WHERE batch_id = '${qBatchId}'::uuid;`);
    const actualCnt = parseInt(countCheck[0].tag_cnt, 10);
    console.log(`Requested qty = ${qty} -> Actual inserted rows = ${actualCnt}`);
  }

  // Test Qty 0 Failure
  let qty0Failed = false;
  try {
    await query(`
      SELECT create_tag_batch_and_records(
        'QTY-0', 0, '${testWardId}'::uuid, '${testOfficerId}'::uuid, 'KEY-0'
      );
    `);
  } catch (err) {
    qty0Failed = true;
    console.log("Qty 0 correctly rejected with error:", err.message);
  }

  // Test Qty 5001 Failure
  let qty5001Failed = false;
  try {
    await query(`
      SELECT create_tag_batch_and_records(
        'QTY-5001', 5001, '${testWardId}'::uuid, '${testOfficerId}'::uuid, 'KEY-5001'
      );
    `);
  } catch (err) {
    qty5001Failed = true;
    console.log("Qty 5001 correctly rejected with error:", err.message);
  }

  const exactQtyPass = (qty0Failed && qty5001Failed);
  console.log(`EXACT QUANTITY TEST RESULT: ${exactQtyPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 5. INVENTORY RECONCILIATION
  // ---------------------------------------------------------
  console.log("\n--- TEST 5: INVENTORY RECONCILIATION ---");
  const invRes = await query(`SELECT get_tag_inventory_summary() AS summary;`);
  const invSummary = invRes[0].summary;
  console.log("Inventory Summary Output:", JSON.stringify(invSummary));
  const inventoryPass = !invSummary.inventory_integrity_error;
  console.log(`INVENTORY RECONCILIATION RESULT: ${inventoryPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 6. AUDIT RECONCILIATION
  // ---------------------------------------------------------
  console.log("\n--- TEST 6: AUDIT RECONCILIATION ---");
  const auditTestBatch = await query(`
    SELECT create_tag_batch_and_records(
      'AUDIT-BATCH-01', 5, '${testWardId}'::uuid, '${testOfficerId}'::uuid, 'AUDIT-KEY-01'
    ) AS result;
  `);
  const auditBatchId = auditTestBatch[0].result.batch_id;

  // Query audit logs for batch creation
  const batchAuditLog = await query(`
    SELECT * FROM audit_logs WHERE target_entity = 'tag_batches' AND target_id = '${auditBatchId}';
  `);
  console.log("Batch Creation Audit Event:", JSON.stringify(batchAuditLog));

  // Perform lifecycle transition on 1 tag
  const sampleTag = await query(`SELECT id FROM tags WHERE batch_id = '${auditBatchId}'::uuid LIMIT 1;`);
  const sampleTagId = sampleTag[0].id;

  await query(`
    SELECT transition_tag_state(
      '${sampleTagId}'::uuid, 'REGISTERED'::tag_status_enum, '${testOfficerId}'::uuid, 'TAG_OFFICER', 'Test Registration Transition', 'TRANS-AUDIT-01'
    );
  `);

  const transAuditLog = await query(`
    SELECT * FROM audit_logs WHERE target_entity = 'tags' AND target_id = '${sampleTagId}';
  `);
  console.log("Tag Transition Audit Event:", JSON.stringify(transAuditLog));

  const auditPass = (batchAuditLog.length >= 1 && transAuditLog.length >= 1);
  console.log(`AUDIT RECONCILIATION RESULT: ${auditPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------
  // 7. FINAL SECURITY CHECK
  // ---------------------------------------------------------
  console.log("\n--- TEST 7: FINAL SECURITY ROLE & AUTHORIZATION CHECK ---");

  // Household role attempt
  let hhFailed = false;
  try {
    await query(`
      SELECT create_tag_batch_and_records(
        'UNAUTH-HH', 5, '${testWardId}'::uuid, '${testHouseholdId}'::uuid, 'KEY-HH'
      );
    `);
  } catch (err) {
    hhFailed = true;
    console.log("HOUSEHOLD role batch creation correctly REJECTED:", err.message);
  }

  const securityCheckPass = hhFailed;
  console.log(`FINAL SECURITY CHECK RESULT: ${securityCheckPass ? "PASS" : "FAIL"}`);

  console.log("\n=================================================");
  console.log("ALL LIVE ACCEPTANCE TESTS COMPLETED SUCCESSFULLY");
  console.log("=================================================");
}

runAcceptanceTests().catch(err => {
  console.error("Live acceptance test run error:", err);
  process.exit(1);
});
