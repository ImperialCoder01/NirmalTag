import test from "node:test";
import assert from "node:assert/strict";

// Tag Lifecycle Transition Rule Engine Validator
function validateTagTransition(currentStatus, newStatus) {
  if (currentStatus === "CLOSED" && ["ACTIVE", "CREATED", "REGISTERED", "ASSIGNED", "SCANNED"].includes(newStatus)) {
    throw new Error("Tag Invariant Violation: CLOSED tags cannot be re-activated or re-used.");
  }
  if (["INVALIDATED", "SUSPENDED"].includes(currentStatus) && ["SCANNED", "VERIFIED", "CLOSED"].includes(newStatus)) {
    throw new Error("Tag Invariant Violation: Suspended tags cannot be processed.");
  }
  return true;
}

test("TAG LIFECYCLE: Valid Transitions", () => {
  assert.equal(validateTagTransition("CREATED", "REGISTERED"), true);
  assert.equal(validateTagTransition("ASSIGNED", "ACTIVE"), true);
  assert.equal(validateTagTransition("ACTIVE", "SCANNED"), true);
  assert.equal(validateTagTransition("VERIFIED", "CLOSED"), true);
});

test("TAG LIFECYCLE: CLOSED -> ACTIVE Invariant Violation Protection", () => {
  assert.throws(
    () => validateTagTransition("CLOSED", "ACTIVE"),
    /Tag Invariant Violation: CLOSED tags cannot be re-activated/
  );
});

test("TAG LIFECYCLE: SUSPENDED -> VERIFIED Violation Protection", () => {
  assert.throws(
    () => validateTagTransition("SUSPENDED", "VERIFIED"),
    /Tag Invariant Violation: Suspended tags cannot be processed/
  );
});
