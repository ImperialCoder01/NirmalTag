import test from "node:test";
import assert from "node:assert/strict";

// Tag Officer Supply Chain Business Rules & Procedure Contract Validator

function validateBatchCreationParams(quantity, role) {
  const allowedRoles = ["TAG_OFFICER", "MCD_OFFICER", "SYSTEM_ADMIN"];
  if (!allowedRoles.includes(role)) {
    throw new Error(`Access Denied: Account role ${role} is not authorized for batch creation.`);
  }
  if (!quantity || quantity <= 0 || quantity > 5000) {
    throw new Error("Tag Batch Error: Batch quantity must be between 1 and 5,000.");
  }
  return true;
}

function generateSerialCode(startSeq, offset) {
  return `NT-SAN-2026-${startSeq + offset}`;
}

function validateTagTransition(currentStatus, newStatus) {
  if (currentStatus === "CLOSED" && ["ACTIVE", "CREATED", "REGISTERED", "ASSIGNED", "SCANNED"].includes(newStatus)) {
    throw new Error("Tag Invariant Violation: CLOSED tags cannot be re-activated or re-used.");
  }
  if (["INVALIDATED", "SUSPENDED", "LOST", "DAMAGED"].includes(currentStatus) && ["SCANNED", "VERIFIED", "CLOSED"].includes(newStatus)) {
    throw new Error("Tag Invariant Violation: Suspended or Invalidated tags cannot be processed.");
  }
  return true;
}

test("SUPPLY CHAIN: Batch Creation Quantity Boundaries (1 - 5000)", () => {
  assert.equal(validateBatchCreationParams(1, "TAG_OFFICER"), true);
  assert.equal(validateBatchCreationParams(5000, "TAG_OFFICER"), true);
  
  assert.throws(
    () => validateBatchCreationParams(0, "TAG_OFFICER"),
    /Tag Batch Error: Batch quantity must be between 1 and 5,000./
  );

  assert.throws(
    () => validateBatchCreationParams(5001, "TAG_OFFICER"),
    /Tag Batch Error: Batch quantity must be between 1 and 5,000./
  );
});

test("SUPPLY CHAIN: Role Authorization Guard", () => {
  assert.equal(validateBatchCreationParams(500, "TAG_OFFICER"), true);
  assert.equal(validateBatchCreationParams(500, "SYSTEM_ADMIN"), true);

  assert.throws(
    () => validateBatchCreationParams(500, "HOUSEHOLD"),
    /Access Denied: Account role HOUSEHOLD is not authorized for batch creation./
  );

  assert.throws(
    () => validateBatchCreationParams(500, "COLLECTOR"),
    /Access Denied: Account role COLLECTOR is not authorized for batch creation./
  );
});

test("SUPPLY CHAIN: Serial Code Formatting", () => {
  const serial = generateSerialCode(1000, 42);
  assert.equal(serial, "NT-SAN-2026-1042");
  assert.match(serial, /^NT-SAN-2026-\d+$/);
});

test("SUPPLY CHAIN: CLOSED Tag Immutability Invariant", () => {
  assert.throws(
    () => validateTagTransition("CLOSED", "ACTIVE"),
    /Tag Invariant Violation: CLOSED tags cannot be re-activated/
  );
  assert.throws(
    () => validateTagTransition("CLOSED", "REGISTERED"),
    /Tag Invariant Violation: CLOSED tags cannot be re-activated/
  );
});
