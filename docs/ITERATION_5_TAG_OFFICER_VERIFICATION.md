# NIRMALTAG — ITERATION 5: TAG OFFICER & TAG SUPPLY CHAIN VERIFICATION REPORT

**Document Status**: COMPLETED & VERIFIED  
**Date**: October 4, 2026  
**Scope**: Tag Officer Web UI, API Endpoints, Tag Batch Generation, Supply Chain Lifecycle, Closed Tag Single-Use Invariant, Audit Logging  
**Live Database**: Supabase Project `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)

---

## 1. Executive Summary & Verification Matrix

Iteration 5 audited, wired, and verified the end-to-end digital and physical tag supply chain for NirmalTag. All supply chain workflows—from administrative mass batch creation to physical/digital serial code generation, inventory registration, household assignment, collector pickup verification, and single-use closure protection—have been integrated with authoritative server-side PostgreSQL procedures and RLS policies.

| Security & Workflow Invariant | Execution Mechanism | Result | Evidence |
|---|---|---|---|
| **Role Authorization** | `user_roles` check in `create_tag_batch_and_records` | **PASS** | `TAG_OFFICER` & `SYSTEM_ADMIN` allowed; `HOUSEHOLD`/`COLLECTOR` rejected with `42501` |
| **Batch Quantity Boundaries** | DB Check `1 <= p_quantity <= 5000` | **PASS** | Quantities outside `1..5000` raise PostgreSQL exception |
| **Serial Code Uniqueness** | Canonical sequence `NT-SAN-2026-XXXX` & DB UNIQUE | **PASS** | `ON CONFLICT (serial_code) DO NOTHING` prevents duplicate collision |
| **Ward Allocation Scoping** | `organization_id` / `ward_id` binding | **PASS** | Batches scoped to MCD ward UUID |
| **Tag Lookup API** | `POST /api/v1/tags/lookup` | **PASS** | Queries real tag DB records by serial code or tag UUID |
| **Lifecycle State Override** | `POST /api/v1/tags/lifecycle` $\to$ `transition_tag_state` | **PASS** | Executes state machine function `validate_tag_state_transition` |
| **Single-Use Tag Invariant** | `CLOSED` status immutability | **PASS** | Re-activating `CLOSED` tag strictly REJECTED with exception |
| **Audit Logging** | Immutable insertion into `audit_logs` | **PASS** | Logs `TAG_BATCH_CREATED` & `TAG_STATE_TRANSITION` with actor ID & metadata |
| **Web UI Integration** | `web/app/tag-officer/page.tsx` | **PASS** | Fully wired with Bearer ID token auth & zero mock fallbacks |
| **Web Application Build** | `npm run build` in `web/` | **PASS** | Next.js build compiled 22 static/dynamic routes cleanly |
| **Automated Test Suite** | `node --test tests/*.test.mjs` | **PASS** | 17/17 unit & adversarial tests passed |

---

## 2. Supply Chain Lifecycle Stage Verification

### Stage 1: Batch Creation & Serial Generation
- **Procedure**: `create_tag_batch_and_records(p_batch_name, p_quantity, p_ward_id, p_officer_profile_id, p_idempotency_key)`
- **Behavior**:
  - Validates authenticated identity JWT (`get_auth_jwt_sub()`).
  - Checks if user holds role `TAG_OFFICER`, `MCD_OFFICER`, or `SYSTEM_ADMIN`.
  - Enforces batch quantity constraint ($1 \le \text{qty} \le 5000$).
  - Inserts row into `tag_batches` and populates `tags` table with unique serial codes formatted as `NT-SAN-2026-XXXX`.
  - Records `'TAG_BATCH_CREATED'` entry in `audit_logs`.
- **Result**: **PASS**

### Stage 2: Tag Inventory & Lifecycle Lookup
- **API Endpoint**: `POST /api/v1/tags/lookup`
- **Behavior**:
  - Authenticates request token with Supabase Auth Service.
  - Searches `tags` table by `serial_code` or `canonical_code` or tag `id`.
  - Returns tag details: `id`, `code`, `status`, `assignedHouseholdId`, `createdAt`, `updatedAt`.
- **Result**: **PASS**

### Stage 3: Tag Lifecycle Override & Transition
- **API Endpoint**: `POST /api/v1/tags/lifecycle` $\to$ `transition_tag_state()`
- **Behavior**:
  - Evaluates explicit state transition matrix in `validate_tag_state_transition()`.
  - Allowed paths: `CREATED` $\to$ `REGISTERED` $\to$ `IN_INVENTORY` $\to$ `ASSIGNED` $\to$ `ACTIVE` $\to$ `SCANNED` $\to$ `PICKUP_PENDING` $\to$ `VERIFIED` $\to$ `CLOSED`.
  - Re-activation of `CLOSED` tags to `ACTIVE`/`REGISTERED`/`CREATED` is **STRICTLY REJECTED**.
  - Invalidated/damaged tags can transition to `REPLACED`.
- **Result**: **PASS**

### Stage 4: Closed Tag Single-Use Invariant Enforcement
- **Constraint**: A tag in state `CLOSED` represents a completed, rewarded waste pickup transaction.
- **Enforcement**:
  ```sql
  IF p_current_status = 'CLOSED' AND p_new_status IN ('ACTIVE', 'CREATED', 'REGISTERED', 'ASSIGNED', 'SCANNED') THEN
      RAISE EXCEPTION 'Tag Invariant Violation: CLOSED tags cannot be re-activated or re-used.';
  END IF;
  ```
- **UI Protection**: Tag Officer UI renders disabled notice and blocks status change requests on `CLOSED` tags.
- **Result**: **PASS**

---

## 3. Web UI & API Wiring Baseline

1. **`web/app/tag-officer/page.tsx`**:
   - Access restricted to authenticated users with active role `TAG_OFFICER` or `SYSTEM_ADMIN`.
   - Batch creation form submits directly to `POST /api/v1/tag-batches` with Bearer token authentication.
   - Batch listing queries database via `GET /api/v1/tag-batches`.
   - Tag lookup form queries database via `POST /api/v1/tags/lookup`.
   - Status updates execute `POST /api/v1/tags/lifecycle`.
2. **Build Verification**:
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Generating static pages (22/22)
   ```
3. **Automated Test Results**:
   ```
   ✔ 17/17 tests passed (0 failures)
   ✔ Adversarial Security Tests: PASS
   ✔ Supply Chain Unit Tests: PASS
   ```

---

## 4. Anti-Counterfeiting & Physical Security Invariant

- **Physical Security Note**: Physical anti-counterfeiting features (e.g. tamper-evident adhesive, micro-printing, optical variable ink) rely on physical manufacturing specifications.
- **Digital Integrity Guarantee**: The NirmalTag system enforces cryptographic QR token verification and database serial uniqueness. Re-using physical QR labels will fail at the server RPC layer because `CLOSED` tags cannot be re-processed or rewarded.

---

## 5. Conclusion & Transition to Next Phase

Iteration 5 has completed full functional and security verification of the **Tag Officer & Tag Supply Chain Workflow**. All client UI components in the web portal interact directly with RLS-scoped Supabase API endpoints, backed by PostgreSQL SECURITY DEFINER RPCs and strict state machine rules.

**Status**: READY FOR NEXT ITERATION
