import test from "node:test";
import assert from "node:assert/strict";

test("CREDIT LEDGER: Idempotency Key Duplicate Prevention", () => {
  const processedKeys = new Set(["SYNC-KEY-101", "SYNC-KEY-102"]);

  function processPickupTransaction(idempotencyKey, creditAmount) {
    if (processedKeys.has(idempotencyKey)) {
      return { status: "ALREADY_PROCESSED", creditPosted: 0 };
    }
    processedKeys.add(idempotencyKey);
    return { status: "SUCCESS", creditPosted: creditAmount };
  }

  // First call succeeds
  const res1 = processPickupTransaction("SYNC-KEY-103", 10.0);
  assert.equal(res1.status, "SUCCESS");
  assert.equal(res1.creditPosted, 10.0);

  // Duplicate call with same idempotency key is rejected
  const res2 = processPickupTransaction("SYNC-KEY-103", 10.0);
  assert.equal(res2.status, "ALREADY_PROCESSED");
  assert.equal(res2.creditPosted, 0);
});
