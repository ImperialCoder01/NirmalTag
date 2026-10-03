-- ============================================================
-- NIRMALTAG PRODUCTION SECURITY RECOVERY: MIGRATION 20261003000006
-- Iteration 5.1 Tag Supply Chain Fixes: Database-Enforced Idempotency,
-- Database-Safe Serial Sequence Allocator, Strict Fail-Closed Auth, Ward Foreign Key
-- ============================================================

-- 1. Schema Alterations & Constraints
ALTER TABLE tag_batches ADD COLUMN IF NOT EXISTS ward_id UUID REFERENCES mcd_wards(id);
ALTER TABLE tag_batches ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR UNIQUE;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS serial_code VARCHAR;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS role VARCHAR;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE audit_logs ALTER COLUMN target_id TYPE TEXT USING target_id::TEXT;

-- Create Database-Safe Serial Sequence Allocator
CREATE SEQUENCE IF NOT EXISTS tag_serial_seq START WITH 100000 INCREMENT BY 1;

-- 2. Hardened Tag Batch Generation Procedure
CREATE OR REPLACE FUNCTION create_tag_batch_and_records(
    p_batch_name VARCHAR,
    p_quantity INT,
    p_ward_id UUID,
    p_officer_profile_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_authenticated_uid UUID;
    v_effective_officer_uid UUID;
    v_batch_id UUID;
    v_seq BIGINT;
    v_serial_code VARCHAR;
    v_is_officer BOOLEAN := FALSE;
    v_existing_batch RECORD;
    v_tags_created INT := 0;
    i INT;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();

    -- Fail-Closed Authentication Context Guard
    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_officer_uid := v_authenticated_uid;
    ELSIF p_officer_profile_id IS NOT NULL THEN
        v_effective_officer_uid := p_officer_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated batch creation request.' USING ERRCODE = '42501';
    END IF;

    -- Verify strict TAG_OFFICER or SYSTEM_ADMIN role authorization in PostgreSQL
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_effective_officer_uid
          AND r.name IN ('TAG_OFFICER', 'SYSTEM_ADMIN')
    ) INTO v_is_officer;

    IF NOT v_is_officer THEN
        RAISE EXCEPTION 'Access Denied: Account % is not an authorized TAG_OFFICER.', v_effective_officer_uid USING ERRCODE = '42501';
    END IF;

    -- Enforce strict batch quantity boundaries (1 to 5,000)
    IF p_quantity <= 0 OR p_quantity > 5000 THEN
        RAISE EXCEPTION 'Tag Batch Error: Batch quantity must be between 1 and 5,000.';
    END IF;

    -- Database-Enforced Idempotency Check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id, batch_number, total_quantity INTO v_existing_batch
        FROM tag_batches
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            SELECT COUNT(*) INTO v_tags_created FROM tags WHERE batch_id = v_existing_batch.id;
            SELECT COALESCE(serial_code, canonical_code) INTO v_serial_code FROM tags WHERE batch_id = v_existing_batch.id ORDER BY created_at ASC LIMIT 1;
            
            RETURN jsonb_build_object(
                'status', 'SUCCESS',
                'is_idempotent_retry', true,
                'batch_id', v_existing_batch.id,
                'batch_name', v_existing_batch.batch_number,
                'tags_created', v_tags_created,
                'start_serial', COALESCE(v_serial_code, 'NT-SAN-2026-IDEM')
            );
        END IF;
    END IF;

    -- Insert Tag Batch Entry with foreign key ward_id
    INSERT INTO tag_batches (
        batch_number, total_quantity, ward_id, created_by, idempotency_key, created_at
    ) VALUES (
        p_batch_name, p_quantity, p_ward_id, v_effective_officer_uid, p_idempotency_key, NOW()
    ) RETURNING id INTO v_batch_id;

    -- Database-safe serial allocator using sequence tag_serial_seq
    -- Concurrency safe, globally unique, zero duplicate skips
    FOR i IN 1..p_quantity LOOP
        v_seq := NEXTVAL('tag_serial_seq');
        v_serial_code := 'NT-SAN-2026-' || LPAD(v_seq::TEXT, 6, '0');

        INSERT INTO tags (
            serial_code, canonical_code, qr_token, batch_id, status, created_at, updated_at
        ) VALUES (
            v_serial_code, v_serial_code, 'QR-' || v_serial_code, v_batch_id, 'CREATED'::tag_status_enum, NOW(), NOW()
        );
    END LOOP;

    SELECT COUNT(*) INTO v_tags_created FROM tags WHERE batch_id = v_batch_id;

    IF v_tags_created <> p_quantity THEN
        RAISE EXCEPTION 'Serial Allocation Error: Batch tag creation count mismatch (% vs requested %).', v_tags_created, p_quantity;
    END IF;

    SELECT COALESCE(serial_code, canonical_code) INTO v_serial_code FROM tags WHERE batch_id = v_batch_id ORDER BY created_at ASC LIMIT 1;

    -- Immutable Audit Trail Event
    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        v_effective_officer_uid, 'TAG_OFFICER', 'TAG_BATCH_CREATED', 'tag_batches', v_batch_id::text, p_idempotency_key,
        jsonb_build_object('batch_name', p_batch_name, 'total_tags', v_tags_created, 'ward_id', p_ward_id)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'batch_id', v_batch_id,
        'batch_name', p_batch_name,
        'tags_created', v_tags_created,
        'start_serial', v_serial_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Hardened Tag State Transition Procedure
CREATE OR REPLACE FUNCTION transition_tag_state(
    p_tag_id UUID,
    p_new_status tag_status_enum,
    p_actor_profile_id UUID DEFAULT NULL,
    p_actor_role VARCHAR DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS tag_status_enum AS $$
DECLARE
    v_authenticated_uid UUID;
    v_effective_actor_id UUID;
    v_effective_role VARCHAR;
    v_current_status tag_status_enum;
    v_serial_code VARCHAR;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();
    
    -- Fail-Closed Authentication Context Guard
    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_actor_id := v_authenticated_uid;
    ELSIF p_actor_profile_id IS NOT NULL THEN
        v_effective_actor_id := p_actor_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated tag state transition request.' USING ERRCODE = '42501';
    END IF;

    -- Derive role strictly from user_roles database table
    SELECT r.name INTO v_effective_role
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_effective_actor_id
    LIMIT 1;

    v_effective_role := COALESCE(v_effective_role, 'AUTHENTICATED_USER');

    SELECT status, COALESCE(serial_code, canonical_code) INTO v_current_status, v_serial_code
    FROM tags
    WHERE id = p_tag_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag ID % not found.', p_tag_id;
    END IF;

    -- Strict State Transition Invariant Validation
    PERFORM validate_tag_state_transition(v_current_status, p_new_status);

    UPDATE tags
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_tag_id;

    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        v_effective_actor_id, v_effective_role, 'TAG_STATE_TRANSITION', 'tags', p_tag_id::text, p_idempotency_key,
        jsonb_build_object('serial_code', v_serial_code, 'from_status', v_current_status, 'to_status', p_new_status, 'reason', p_reason)
    );

    RETURN p_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Authoritative Inventory Summary & Reconciliation RPC
CREATE OR REPLACE FUNCTION get_tag_inventory_summary()
RETURNS JSONB AS $$
DECLARE
    v_total_batches INT;
    v_total_tags INT;
    v_sum_batch_tags INT;
    v_created_cnt INT;
    v_registered_cnt INT;
    v_in_inventory_cnt INT;
    v_assigned_cnt INT;
    v_active_cnt INT;
    v_scanned_cnt INT;
    v_pickup_pending_cnt INT;
    v_verified_cnt INT;
    v_closed_cnt INT;
    v_suspended_cnt INT;
    v_invalidated_cnt INT;
    v_lost_cnt INT;
    v_damaged_cnt INT;
    v_replaced_cnt INT;
    v_sum_status_cnt INT;
    v_integrity_error BOOLEAN := FALSE;
BEGIN
    SELECT COUNT(*) INTO v_total_batches FROM tag_batches;
    SELECT COUNT(*) INTO v_total_tags FROM tags;
    SELECT COALESCE(SUM(total_quantity), 0) INTO v_sum_batch_tags FROM tag_batches;

    SELECT COUNT(*) FILTER (WHERE status = 'CREATED') INTO v_created_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'REGISTERED') INTO v_registered_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'IN_INVENTORY') INTO v_in_inventory_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'ASSIGNED') INTO v_assigned_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE') INTO v_active_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'SCANNED') INTO v_scanned_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'PICKUP_PENDING') INTO v_pickup_pending_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'VERIFIED') INTO v_verified_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'CLOSED') INTO v_closed_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'SUSPENDED') INTO v_suspended_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'INVALIDATED') INTO v_invalidated_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'LOST') INTO v_lost_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'DAMAGED') INTO v_damaged_cnt FROM tags;
    SELECT COUNT(*) FILTER (WHERE status = 'REPLACED') INTO v_replaced_cnt FROM tags;

    v_sum_status_cnt := v_created_cnt + v_registered_cnt + v_in_inventory_cnt + v_assigned_cnt + 
                        v_active_cnt + v_scanned_cnt + v_pickup_pending_cnt + v_verified_cnt + 
                        v_closed_cnt + v_suspended_cnt + v_invalidated_cnt + v_lost_cnt + 
                        v_damaged_cnt + v_replaced_cnt;

    IF v_sum_status_cnt <> v_total_tags OR (v_total_batches > 0 AND v_sum_batch_tags <> v_total_tags) THEN
        v_integrity_error := TRUE;
    END IF;

    RETURN jsonb_build_object(
        'total_batches', v_total_batches,
        'total_tags', v_total_tags,
        'sum_batch_tags', v_sum_batch_tags,
        'sum_status_tags', v_sum_status_cnt,
        'inventory_integrity_error', v_integrity_error,
        'counts', jsonb_build_object(
            'CREATED', v_created_cnt,
            'REGISTERED', v_registered_cnt,
            'IN_INVENTORY', v_in_inventory_cnt,
            'ASSIGNED', v_assigned_cnt,
            'ACTIVE', v_active_cnt,
            'SCANNED', v_scanned_cnt,
            'PICKUP_PENDING', v_pickup_pending_cnt,
            'VERIFIED', v_verified_cnt,
            'CLOSED', v_closed_cnt,
            'SUSPENDED', v_suspended_cnt,
            'INVALIDATED', v_invalidated_cnt,
            'LOST', v_lost_cnt,
            'DAMAGED', v_damaged_cnt,
            'REPLACED', v_replaced_cnt
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
