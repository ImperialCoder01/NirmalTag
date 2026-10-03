# NIRMALTAG — ITERATION 5: TAG OFFICER & TAG SUPPLY CHAIN FORENSIC BASELINE

**Document Status**: AUTHORITATIVE BASELINE AUDIT  
**Date**: October 4, 2026  
**Scope**: Digital & Physical Tag Supply Chain Architecture, Backend Procedures, API Integration, and Web UI Wiring  
**Live Target**: Supabase Project `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)

---

## 1. Executive Summary & Forensic Scope

Iteration 5 verifies the end-to-end digital and physical tag supply chain for NirmalTag. While Iterations 1.5–1.6H established secure backend RPCs, and Iterations 4.0–4.1 completed Collector pickup verification, Iteration 5 connects the **Tag Officer Administrative System** directly to live database RPCs.

### Authoritative Tag Lifecycle State Machine
```
[CREATED] ──► [REGISTERED] ──► [IN_INVENTORY] ──► [ASSIGNED] ──► [ACTIVE] 
                                                                    │
[CLOSED] (Immutable) ◄── [VERIFIED] ◄── [PICKUP_PENDING] ◄── [SCANNED]
```

### Single-Use Tag Protection Invariants
1. **`CLOSED` Immutability**: Any attempt to transition a `CLOSED` tag to `ACTIVE`, `ASSIGNED`, `REGISTERED`, or `CREATED` is rejected at the database layer via PostgreSQL exception `Tag State Machine Violation`.
2. **Replacement Flow**: Tags marked `CLOSED`, `INVALIDATED`, `LOST`, or `DAMAGED` can only transition to state `REPLACED`.

---

## 2. Forensic Analysis of Supply Chain Components

### 2.1 Web UI (`web/app/tag-officer/page.tsx`)
- **Role Enforcement**: UI guards page access requiring authenticated user session with role `TAG_OFFICER` or `SYSTEM_ADMIN`. Non-officer attempts display HTTP 403 Access Denied.
- **Batch Generation Form**: Form captures `batchCount` (quantity 1–5000), `wasteCategory`, and `targetWard`.
- **API Disconnects Identified**:
  1. The form originally sent `batch_count` instead of `quantity` expected by `/api/v1/tag-batches/route.ts`.
  2. Fallback catch blocks generated simulated local tags when error responses were returned instead of stopping on server rejection.
  3. Tag lookup & status override relied on hardcoded local mock data (`code.endsWith("490") ? "CLOSED" : "ACTIVE"`).

### 2.2 API Routes
- **`web/app/api/v1/tag-batches/route.ts`**:
  - Authenticates request using `authenticateServerRequest(request)` via Firebase ID token (`Bearer <token>`).
  - Calls PostgreSQL procedure `create_tag_batch_and_records` with RLS-scoped user client (`supabaseUserClient.rpc`).
  - Passes parameters `p_batch_name`, `p_quantity`, `p_ward_id`, `p_officer_profile_id`, `p_idempotency_key`.
  - Returns HTTP 201 Created on success or HTTP 422/401/500 with explicit error codes on rejection.
- **`web/app/api/v1/tags/lifecycle/route.ts`**:
  - Authenticates request using `authenticateServerRequest(request)`.
  - Executes `transition_tag_state` RPC.
  - Accepts `tagId`, `newStatus`, `reason`, `idempotencyKey`.
  - Returns HTTP 200 OK on completion or HTTP 422 on state transition violation.

### 2.3 Database RPCs & Authorization
1. **`create_tag_batch_and_records`**:
   - `v_authenticated_uid` extracted via `get_auth_jwt_sub()`.
   - Validates role `TAG_OFFICER`, `MCD_OFFICER`, or `SYSTEM_ADMIN` in `user_roles`.
   - Enforces quantity boundary: `1 <= quantity <= 5000`.
   - Inserts row into `tag_batches` and loops to generate canonical serial codes `NT-SAN-2026-XXXX`.
   - Inserts immutable audit log entry `'TAG_BATCH_CREATED'`.
2. **`transition_tag_state`**:
   - Acquires row-level lock `FOR UPDATE` on `tags` table.
   - Evaluates `validate_tag_state_transition(v_current_status, p_new_status)`.
   - Updates tag status and timestamp `updated_at`.
   - Inserts audit log entry `'TAG_STATE_TRANSITION'`.

---

## 3. End-to-End Tag Supply Chain Trace

| Step | State | Triggering Actor | Execution Mechanism | Invariants & DB Enforcement |
|---|---|---|---|---|
| **1. Batch Creation** | `CREATED` | Tag Officer / System Admin | `create_tag_batch_and_records()` | `1 <= qty <= 5000`, `serial_code` UNIQUE, `TAG_OFFICER` role check |
| **2. Registration** | `REGISTERED` | Tag Officer | `transition_tag_state()` | Valid state machine transition from `CREATED` |
| **3. Inventory** | `IN_INVENTORY` | Tag Officer / Warehouse | `transition_tag_state()` | Logged in `audit_logs` with actor ID |
| **4. Household Assignment** | `ASSIGNED` | Field Tag Officer | `transition_tag_state()` | Assigned to household profile ID |
| **5. Activation** | `ACTIVE` | Household / Officer | `transition_tag_state()` | Ready for waste deposition & scan |
| **6. Collector Scanning** | `SCANNED` | Collector | `transition_tag_state()` | Validated against physical QR / serial |
| **7. Pickup Pending** | `PICKUP_PENDING` | Collector Mobile App | WorkManager sync worker | Evidence SHA-256 hash attached |
| **8. Verification & Reward** | `VERIFIED` | Server Transaction RPC | `process_verified_pickup_transaction_v2` | Atomic balance credit & incentive release |
| **9. Final Closure** | `CLOSED` | Server Transaction RPC | `process_verified_pickup_transaction_v2` | Single-use invariant; **IMMUTABLE** |

---

## 4. Required Remediation for Iteration 5 Integration

1. **Refactor `web/app/tag-officer/page.tsx`**:
   - Obtain Firebase ID token via `getIdToken()` from `useAuth()`.
   - Pass `Authorization: Bearer <token>` in header for all API calls.
   - Correct request payload sent to `POST /api/v1/tag-batches`: `{ batchName, quantity, wardId, idempotencyKey }`.
   - Wire Tag Lookup & Override to use real API endpoint for tag details & state transition.
   - Remove fake local fallback generators. On API failure, display clear error message to user.
2. **Add Tag Lookup Endpoint (`web/app/api/v1/tags/lookup/route.ts`)**:
   - Implement GET/POST endpoint to fetch tag record by serial code or UUID from Supabase database.
3. **Verify Execution**:
   - Run build and test suites to guarantee zero TypeScript or compilation errors.
