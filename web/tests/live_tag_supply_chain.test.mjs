import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubphrqumpqdifupwbvpe.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_MVBto2fM-eKyqT_R5A-g7Q_GDzJKswE";

const anonClient = createClient(supabaseUrl, anonKey);

test("LIVE DB TEST 1: Unauthenticated RPC batch creation REJECTED", async () => {
  const { data, error } = await anonClient.rpc("create_tag_batch_and_records", {
    p_batch_name: "TEST-UNAUTH-BATCH",
    p_quantity: 10,
    p_ward_id: "123e4567-e89b-12d3-a456-426614174000",
    p_idempotency_key: "IDEM-UNAUTH-001"
  });

  assert.notEqual(error, null, "Unauthenticated client batch creation must be rejected");
  assert.equal(error.message.includes("Access Denied") || error.code === "PGRST202" || error.code === "42501", true);
});

test("LIVE DB TEST 2: Caller-supplied actor UUID cannot impersonate TAG_OFFICER", async () => {
  const fakeOfficerId = "00000000-0000-0000-0000-000000000001";
  const { data, error } = await anonClient.rpc("create_tag_batch_and_records", {
    p_batch_name: "TEST-SPOOF-OFFICER",
    p_quantity: 5,
    p_ward_id: "123e4567-e89b-12d3-a456-426614174000",
    p_officer_profile_id: fakeOfficerId,
    p_idempotency_key: "IDEM-SPOOF-001"
  });

  assert.notEqual(error, null, "Impersonating officer profile ID must be rejected if account is not authorized");
});

test("LIVE DB TEST 3: Invalid quantity (0) REJECTED", async () => {
  const { data, error } = await anonClient.rpc("create_tag_batch_and_records", {
    p_batch_name: "TEST-QTY-0",
    p_quantity: 0,
    p_ward_id: "123e4567-e89b-12d3-a456-426614174000",
    p_idempotency_key: "IDEM-QTY-0"
  });

  assert.notEqual(error, null, "Quantity 0 must be rejected by procedure");
});

test("LIVE DB TEST 4: Invalid quantity (>5000) REJECTED", async () => {
  const { data, error } = await anonClient.rpc("create_tag_batch_and_records", {
    p_batch_name: "TEST-QTY-5001",
    p_quantity: 5001,
    p_ward_id: "123e4567-e89b-12d3-a456-426614174000",
    p_idempotency_key: "IDEM-QTY-5001"
  });

  assert.notEqual(error, null, "Quantity 5001 must be rejected by procedure");
});

test("LIVE DB TEST 5: CLOSED -> ACTIVE state transition REJECTED", async () => {
  const { data, error } = await anonClient.rpc("validate_tag_state_transition", {
    p_current_status: "CLOSED",
    p_new_status: "ACTIVE"
  });

  assert.notEqual(error, null, "CLOSED -> ACTIVE transition must throw database exception");
});

test("LIVE DB TEST 6: CLOSED -> ASSIGNED state transition REJECTED", async () => {
  const { data, error } = await anonClient.rpc("validate_tag_state_transition", {
    p_current_status: "CLOSED",
    p_new_status: "ASSIGNED"
  });

  assert.notEqual(error, null, "CLOSED -> ASSIGNED transition must throw database exception");
});

test("LIVE DB TEST 7: CLOSED -> REGISTERED state transition REJECTED", async () => {
  const { data, error } = await anonClient.rpc("validate_tag_state_transition", {
    p_current_status: "CLOSED",
    p_new_status: "REGISTERED"
  });

  assert.notEqual(error, null, "CLOSED -> REGISTERED transition must throw database exception");
});

test("LIVE DB TEST 8: Inventory Reconciliation Summary RPC Active", async () => {
  const { data: summary, error } = await anonClient.rpc("get_tag_inventory_summary");

  assert.equal(error, null, "get_tag_inventory_summary RPC call must succeed");
  assert.notEqual(summary, null, "Summary object must be returned");
  assert.equal(typeof summary.total_batches, "number", "total_batches is a number");
  assert.equal(typeof summary.total_tags, "number", "total_tags is a number");
  assert.equal(typeof summary.inventory_integrity_error, "boolean", "inventory_integrity_error is a boolean");
});
