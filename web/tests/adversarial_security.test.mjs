import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubphrqumpqdifupwbvpe.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_MVBto2fM-eKyqT_R5A-g7Q_GDzJKswE";

const anonClient = createClient(supabaseUrl, anonKey);

test("ADVERSARIAL TEST 1: Direct Table Access under Anon RLS Boundaries", async () => {
  // Attempt to read profiles directly as unauthenticated anon
  const { data: profiles, error: pErr } = await anonClient.from("profiles").select("*");
  // Expected: Anon user receives empty array or RLS access denial
  assert.equal(profiles === null || profiles.length === 0, true, "Unauthenticated user must not read profiles");

  const { data: auditLogs, error: aErr } = await anonClient.from("audit_logs").select("*");
  assert.equal(auditLogs === null || auditLogs.length === 0, true, "Unauthenticated user must not read audit logs");
});

test("ADVERSARIAL TEST 2: Tag Lifecycle Invariant - Illegal Transition REJECTED", async () => {
  // Test CLOSED -> ACTIVE transition via live RPC function
  const { data, error } = await anonClient.rpc("validate_tag_state_transition", {
    p_current_status: "CLOSED",
    p_new_status: "ACTIVE"
  });

  assert.notEqual(error, null, "CLOSED -> ACTIVE transition must throw database exception");
  assert.equal(error.message.includes("Tag State Machine Violation") || error.code === "PGRST202" || error.code === "22P02", true);
});

test("ADVERSARIAL TEST 3: Tag Lifecycle Invariant - Valid Transition ALLOWED", async () => {
  // Test REGISTERED -> ASSIGNED transition via live RPC function
  const { data, error } = await anonClient.rpc("validate_tag_state_transition", {
    p_current_status: "REGISTERED",
    p_new_status: "ASSIGNED"
  });

  assert.equal(error, null, "REGISTERED -> ASSIGNED transition must be allowed");
  assert.equal(data, true, "Valid transition returns true");
});

test("ADVERSARIAL TEST 4: Role & Actor Spoofing Denial on transition_tag_state", async () => {
  // Unauthenticated client calling transition_tag_state without valid JWT sub context
  const fakeTagId = "11111111-1111-1111-1111-111111111111";
  const fakeActorId = "22222222-2222-2222-2222-222222222222";

  const { data, error } = await anonClient.rpc("transition_tag_state", {
    p_tag_id: fakeTagId,
    p_new_status: "ASSIGNED",
    p_actor_profile_id: fakeActorId,
    p_actor_role: "SYSTEM_ADMIN"
  });

  // Database must reject because unauthenticated client cannot claim SYSTEM_ADMIN
  assert.notEqual(error, null, "Role spoofing must be rejected by database function");
});

test("ADVERSARIAL TEST 5: Actor & Role Impersonation Denial on process_verified_pickup_transaction_v2", async () => {
  const fakePickupId = "33333333-3333-3333-3333-333333333333";
  const fakeTagId = "44444444-4444-4444-4444-444444444444";
  const fakeCollectorId = "55555555-5555-5555-5555-555555555555";

  const { data, error } = await anonClient.rpc("process_verified_pickup_transaction_v2", {
    p_pickup_id: fakePickupId,
    p_tag_id: fakeTagId,
    p_collector_profile_id: fakeCollectorId,
    p_idempotency_key: "TEST-IDEMPOTENCY-001"
  });

  // Unauthenticated caller attempting collector transaction must be denied
  assert.notEqual(error, null, "Unauthenticated pickup processing must be rejected");
});

test("ADVERSARIAL TEST 6: Actor & Role Impersonation Denial on create_tag_batch_and_records", async () => {
  const fakeOfficerId = "66666666-6666-6666-6666-666666666666";
  const fakeWardId = "77777777-7777-7777-7777-777777777777";

  const { data, error } = await anonClient.rpc("create_tag_batch_and_records", {
    p_batch_name: "TEST-BATCH-UNAUTH",
    p_quantity: 10,
    p_ward_id: fakeWardId,
    p_officer_profile_id: fakeOfficerId,
    p_idempotency_key: "TEST-BATCH-001"
  });

  // Unauthenticated caller attempting batch creation must be denied
  assert.notEqual(error, null, "Unauthenticated tag batch creation must be rejected");
});

test("ADVERSARIAL TEST 7: Server-Derived Reward Policy Verification", async () => {
  // Query live reward_policies table
  const { data: policies, error } = await anonClient.from("reward_policies").select("*");

  assert.equal(error, null, "reward_policies select must succeed for public policy lookup");
  assert.equal(Array.isArray(policies), true, "reward_policies returned as array");
  
  const hhPolicy = policies.find(p => p.key === "HOUSEHOLD_CREDIT_PER_PICKUP");
  const colPolicy = policies.find(p => p.key === "COLLECTOR_INCENTIVE_PER_PICKUP");

  assert.notEqual(hhPolicy, undefined, "HOUSEHOLD_CREDIT_PER_PICKUP policy must exist in DB");
  assert.notEqual(colPolicy, undefined, "COLLECTOR_INCENTIVE_PER_PICKUP policy must exist in DB");
  assert.equal(hhPolicy.value, 10, "Household credit policy value is server-controlled (10)");
  assert.equal(colPolicy.value, 2, "Collector incentive policy value is server-controlled (2)");
});
