import test from "node:test";
import assert from "node:assert/strict";

// Household Tag Ownership & RWA Security Rules Engine Validator

function validateTagAssignmentRule(tagStatus, currentHouseholdId, targetHouseholdId, callerRole) {
  const allowedRoles = ["TAG_OFFICER", "SYSTEM_ADMIN"];
  if (!allowedRoles.includes(callerRole)) {
    throw new Error(`Access Denied: Account role ${callerRole} is not authorized to assign tags.`);
  }

  if (["CLOSED", "INVALIDATED", "DAMAGED", "LOST", "REPLACED"].includes(tagStatus)) {
    throw new Error(`Tag Invariant Violation: Tag in state ${tagStatus} cannot be assigned to household.`);
  }

  if (currentHouseholdId && currentHouseholdId !== targetHouseholdId) {
    throw new Error(`Tag Ownership Conflict: Tag is already assigned to household ${currentHouseholdId}.`);
  }

  if (currentHouseholdId === targetHouseholdId) {
    return { status: "SUCCESS", is_idempotent_retry: true };
  }

  return { status: "SUCCESS", new_status: "ASSIGNED" };
}

function validateTagActivationRule(tagStatus, assignedHouseholdId, callerHouseholdId) {
  if (!callerHouseholdId || assignedHouseholdId !== callerHouseholdId) {
    throw new Error("Access Denied: Tag is not assigned to your household.");
  }

  if (tagStatus === "ACTIVE") {
    return { status: "SUCCESS", is_idempotent_retry: true };
  }

  if (tagStatus !== "ASSIGNED") {
    throw new Error(`Tag Activation Error: Tag in state ${tagStatus} cannot be activated.`);
  }

  return { status: "SUCCESS", new_status: "ACTIVE" };
}

test("HOUSEHOLD OWNERSHIP: Valid Tag Assignment", () => {
  const res = validateTagAssignmentRule("REGISTERED", null, "hh-101", "TAG_OFFICER");
  assert.equal(res.status, "SUCCESS");
  assert.equal(res.new_status, "ASSIGNED");
});

test("HOUSEHOLD OWNERSHIP: Reassignment Rejection (Fail Closed)", () => {
  assert.throws(
    () => validateTagAssignmentRule("ASSIGNED", "hh-101", "hh-202", "TAG_OFFICER"),
    /Tag Ownership Conflict: Tag is already assigned to household hh-101./
  );
});

test("HOUSEHOLD OWNERSHIP: CLOSED Tag Assignment Rejection", () => {
  assert.throws(
    () => validateTagAssignmentRule("CLOSED", null, "hh-101", "TAG_OFFICER"),
    /Tag Invariant Violation: Tag in state CLOSED cannot be assigned to household./
  );
});

test("HOUSEHOLD OWNERSHIP: Duplicate Assignment Idempotency", () => {
  const res = validateTagAssignmentRule("ASSIGNED", "hh-101", "hh-101", "TAG_OFFICER");
  assert.equal(res.status, "SUCCESS");
  assert.equal(res.is_idempotent_retry, true);
});

test("HOUSEHOLD OWNERSHIP: Role Authorization Guard for Assignment", () => {
  assert.throws(
    () => validateTagAssignmentRule("REGISTERED", null, "hh-101", "HOUSEHOLD"),
    /Access Denied: Account role HOUSEHOLD is not authorized to assign tags./
  );
  assert.throws(
    () => validateTagAssignmentRule("REGISTERED", null, "hh-101", "COLLECTOR"),
    /Access Denied: Account role COLLECTOR is not authorized to assign tags./
  );
  assert.throws(
    () => validateTagAssignmentRule("REGISTERED", null, "hh-101", "RWA_ADMIN"),
    /Access Denied: Account role RWA_ADMIN is not authorized to assign tags./
  );
});

test("HOUSEHOLD ACTIVATION: Valid Resident Self-Activation", () => {
  const res = validateTagActivationRule("ASSIGNED", "hh-101", "hh-101");
  assert.equal(res.status, "SUCCESS");
  assert.equal(res.new_status, "ACTIVE");
});

test("HOUSEHOLD ACTIVATION: Cross-Household Activation Rejection", () => {
  assert.throws(
    () => validateTagActivationRule("ASSIGNED", "hh-101", "hh-202"),
    /Access Denied: Tag is not assigned to your household./
  );
});

test("HOUSEHOLD ACTIVATION: Non-ASSIGNED Tag Activation Rejection", () => {
  assert.throws(
    () => validateTagActivationRule("CREATED", "hh-101", "hh-101"),
    /Tag Activation Error: Tag in state CREATED cannot be activated./
  );
});
