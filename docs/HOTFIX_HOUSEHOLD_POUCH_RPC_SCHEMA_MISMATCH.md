# NIRMALTAG HOTFIX REPORT — HOUSEHOLD POUCH REQUEST RPC SCHEMA MISMATCH

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Project Ref:** `ubphrqumpqdifupwbvpe`  
**Affected RPC:** `public.request_household_pouch(p_category_code text, p_quantity integer)`  
**Status:** **FIXED AND PRODUCTION VERIFIED**  

---

## 1. EXACT ERROR & SYMPTOMS

When attempting to order/request a leak-proof sanitary pouch on the live Household Resident web portal, the application returned:

```text
"Could not find the function public.request_household_pouch(p_category_code, p_quantity) in the schema cache"
```

HTTP Status: `404 / 422`  
PostgREST Error Code: `PGRST202`  

---

## 2. FORENSIC ROOT CAUSE ANALYSIS

1. **Unapplied Production Migrations:**  
   The database migrations `20261004200000_iteration19_full_operational_loop.sql` and `20261004210000_iteration25_pouch_fulfillment_rpc.sql` were created in the local Git repository, but had not been pushed to the linked production Supabase PostgreSQL database (`ubphrqumpqdifupwbvpe`).
   As a result, tables `pouch_requests`, `pickup_slot_configurations`, `pickup_requests`, `in_app_notifications`, and `disputes` as well as routines `request_household_pouch`, `fulfill_household_pouch_request`, and `book_pickup_appointment` were entirely missing from the live schema, returning HTTP 404 / `PGRST202` from the PostgREST REST gateway.

2. **Column Reference Bug in `fulfill_household_pouch_request`:**  
   In `20261004210000_iteration25_pouch_fulfillment_rpc.sql`, line 30 executed `SELECT role INTO v_actor_role FROM user_roles`. Because `user_roles` links `user_id` to `role_id` (without a literal `role` column), role lookups threw `ERROR 42703: column "role" does not exist`.

---

## 3. APPLIED MIGRATION & REPAIR DETAILS

1. **Live Migration Deployment:**  
   Applied `20261004200000_iteration19_full_operational_loop.sql` and `20261004210000_iteration25_pouch_fulfillment_rpc.sql` directly to project `ubphrqumpqdifupwbvpe` via the Supabase Management SQL API (`https://api.supabase.com/v1/projects/ubphrqumpqdifupwbvpe/database/query`).

2. **SQL Procedure Fix in `20261004210000_iteration25_pouch_fulfillment_rpc.sql`:**  
   Updated role resolution to query `user_roles` joined with `roles` table:
   ```sql
   SELECT r.name INTO v_actor_role
   FROM user_roles ur
   JOIN roles r ON ur.role_id = r.id
   WHERE ur.user_id = v_actor_profile_id
   LIMIT 1;

   IF v_actor_role IS NULL THEN
       SELECT role::text INTO v_actor_role FROM profiles WHERE id = v_actor_profile_id;
   END IF;
   ```

---

## 4. AUTHORITATIVE RPC FUNCTION CONTRACT

```sql
CREATE OR REPLACE FUNCTION request_household_pouch(
    p_category_code TEXT,
    p_quantity INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
    v_profile_id UUID;
    v_household_id UUID;
    v_category_id UUID;
    v_request_id UUID;
    v_assigned_tag_id UUID;
    v_tag_code TEXT;
BEGIN
    v_profile_id := get_authenticated_profile_id();
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated pouch request.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_household_id FROM households WHERE user_id = v_profile_id;
    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Account is not a registered household.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_category_id FROM waste_categories WHERE code = p_category_code;
    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Invalid Waste Category: %', p_category_code USING ERRCODE = '22023';
    END IF;

    INSERT INTO pouch_requests (household_id, waste_category_id, quantity, status)
    VALUES (v_household_id, v_category_id, COALESCE(p_quantity, 1), 'REQUESTED')
    RETURNING id INTO v_request_id;

    -- Optional auto-allocate IN_INVENTORY tag
    SELECT id, canonical_code INTO v_assigned_tag_id, v_tag_code
    FROM tags
    WHERE waste_category_id = v_category_id AND status = 'IN_INVENTORY'
    LIMIT 1 FOR UPDATE SKIP LOCKED;

    IF v_assigned_tag_id IS NOT NULL THEN
        UPDATE tags
        SET status = 'ASSIGNED', current_assigned_household_id = v_household_id, updated_at = NOW()
        WHERE id = v_assigned_tag_id;

        UPDATE pouch_requests
        SET status = 'TAG_ALLOCATED', allocated_tag_ids = ARRAY[v_assigned_tag_id], updated_at = NOW()
        WHERE id = v_request_id;
    END IF;

    INSERT INTO in_app_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (v_profile_id, 'Pouch Order Received', 'Your request for ' || p_category_code || ' waste pouch has been registered.', 'POUCH_REQUEST', 'pouch_requests', v_request_id);

    RETURN jsonb_build_object(
        'success', true,
        'requestId', v_request_id,
        'status', CASE WHEN v_assigned_tag_id IS NOT NULL THEN 'TAG_ALLOCATED' ELSE 'REQUESTED' END,
        'allocatedTagCode', v_tag_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 5. VERIFICATION MATRIX & TEST RESULTS

| Check / Test | Command / Target | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Table Existence** | PostgREST GET `rest/v1/pouch_requests` | **HTTP 200** | Table exists in live schema |
| **RPC Schema Cache** | PostgREST RPC `request_household_pouch` | **HTTP 401/42501** | Function resolved in schema cache |
| **Live RPC Execution** | `scripts/test_pouch_request_rpc_live.mjs` | **PASS** | `requestId` generated, database row created |
| **Fulfillment Loop** | `fulfill_household_pouch_request` RPC | **PASS** | `DELIVERED` status, tag `IN_INVENTORY` -> `ASSIGNED` |
| **Fulfillment Replay** | Idempotency replay check | **PASS** | Returns `already fulfilled (idempotent)` with 0 deltas |
| **Negative Validation 1** | Invalid waste category code | **PASS** | Rejected with ERRCODE `22023` |
| **Negative Validation 2** | Unauthenticated caller | **PASS** | Rejected with ERRCODE `42501` |
| **Node Test Suite** | `node --env-file=.env.local --test tests/*.test.mjs` | **PASS** | **82 / 82 tests passed** (0 failures) |
| **Next.js Web Build** | `npm run build` | **PASS** | Compiled 46 static & dynamic routes cleanly |
| **Android Unit Tests** | `.\gradlew.bat test` | **PASS** | `BUILD SUCCESSFUL` (54 tasks) |

---

## 6. FINAL VERDICT

`HOUSEHOLD POUCH REQUEST — FIXED AND PRODUCTION VERIFIED`
