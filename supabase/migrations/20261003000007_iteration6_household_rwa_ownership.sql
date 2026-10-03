-- ============================================================
-- NIRMALTAG PRODUCTION SECURITY RECOVERY: MIGRATION 20261003000007
-- Iteration 6 Household Assignment, Ownership Invariants & RWA Workflow
-- ============================================================

-- 1. Authoritative Tag-to-Household Assignment Procedure
CREATE OR REPLACE FUNCTION assign_tag_to_household(
    p_tag_id UUID,
    p_household_id UUID,
    p_officer_profile_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_authenticated_uid UUID;
    v_effective_officer_uid UUID;
    v_current_status tag_status_enum;
    v_current_household_id UUID;
    v_serial_code VARCHAR;
    v_is_officer BOOLEAN := FALSE;
    v_household_exists BOOLEAN := FALSE;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();

    -- Fail-Closed Authentication Context Guard
    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_officer_uid := v_authenticated_uid;
    ELSIF p_officer_profile_id IS NOT NULL THEN
        v_effective_officer_uid := p_officer_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated tag assignment request.' USING ERRCODE = '42501';
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

    -- Verify target household exists
    SELECT EXISTS (
        SELECT 1 FROM households WHERE id = p_household_id
    ) INTO v_household_exists;

    IF NOT v_household_exists THEN
        RAISE EXCEPTION 'Tag Assignment Error: Target household % does not exist.', p_household_id;
    END IF;

    -- Lock and inspect tag record
    SELECT status, current_assigned_household_id, COALESCE(serial_code, canonical_code)
    INTO v_current_status, v_current_household_id, v_serial_code
    FROM tags
    WHERE id = p_tag_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag ID % not found.', p_tag_id;
    END IF;

    -- Idempotency Retry Check: Same tag already assigned to same household
    IF v_current_household_id = p_household_id THEN
        RETURN jsonb_build_object(
            'status', 'SUCCESS',
            'is_idempotent_retry', true,
            'tag_id', p_tag_id,
            'household_id', p_household_id,
            'current_status', v_current_status
        );
    END IF;

    -- Reassignment Protection: Fail closed if tag belongs to another household
    IF v_current_household_id IS NOT NULL AND v_current_household_id <> p_household_id THEN
        RAISE EXCEPTION 'Tag Ownership Conflict: Tag % is already assigned to household %.', v_serial_code, v_current_household_id USING ERRCODE = '42P01';
    END IF;

    -- Invariant Check: Closed or invalidated tags cannot be assigned
    IF v_current_status IN ('CLOSED', 'INVALIDATED', 'DAMAGED', 'LOST', 'REPLACED') THEN
        RAISE EXCEPTION 'Tag Invariant Violation: Tag % in state % cannot be assigned to household.', v_serial_code, v_current_status USING ERRCODE = '42P01';
    END IF;

    -- Execute Tag Ownership Assignment
    UPDATE tags
    SET status = 'ASSIGNED'::tag_status_enum,
        current_assigned_household_id = p_household_id,
        updated_at = NOW()
    WHERE id = p_tag_id;

    -- Insert Audit Record in tag_assignments table
    INSERT INTO tag_assignments (
        tag_id, household_id, assigned_by, assigned_at
    ) VALUES (
        p_tag_id, p_household_id, v_effective_officer_uid, NOW()
    );

    -- Insert Immutable Event into audit_logs
    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        v_effective_officer_uid, 'TAG_OFFICER', 'TAG_ASSIGNED_TO_HOUSEHOLD', 'tags', p_tag_id::text, p_idempotency_key,
        jsonb_build_object('household_id', p_household_id, 'serial_code', v_serial_code, 'previous_status', v_current_status)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'tag_id', p_tag_id,
        'household_id', p_household_id,
        'new_status', 'ASSIGNED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Household Self-Activation Procedure
CREATE OR REPLACE FUNCTION activate_household_tag(
    p_tag_id UUID,
    p_household_profile_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_authenticated_uid UUID;
    v_effective_user_id UUID;
    v_household_id UUID;
    v_current_status tag_status_enum;
    v_current_assigned_hh UUID;
    v_serial_code VARCHAR;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();

    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_user_id := v_authenticated_uid;
    ELSIF p_household_profile_id IS NOT NULL THEN
        v_effective_user_id := p_household_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated tag activation request.' USING ERRCODE = '42501';
    END IF;

    -- Resolve household ID for authenticated resident
    SELECT id INTO v_household_id
    FROM households
    WHERE user_id = v_effective_user_id;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Authenticated account % is not registered as a household resident.', v_effective_user_id USING ERRCODE = '42501';
    END IF;

    -- Lock and verify tag
    SELECT status, current_assigned_household_id, COALESCE(serial_code, canonical_code)
    INTO v_current_status, v_current_assigned_hh, v_serial_code
    FROM tags
    WHERE id = p_tag_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag ID % not found.', p_tag_id;
    END IF;

    -- Household Ownership Guard: Cannot activate another household's tag
    IF v_current_assigned_hh IS NULL OR v_current_assigned_hh <> v_household_id THEN
        RAISE EXCEPTION 'Access Denied: Tag % is not assigned to your household.', v_serial_code USING ERRCODE = '42501';
    END IF;

    -- Idempotent Retry Check
    IF v_current_status = 'ACTIVE' THEN
        RETURN jsonb_build_object(
            'status', 'SUCCESS',
            'is_idempotent_retry', true,
            'tag_id', p_tag_id,
            'current_status', 'ACTIVE'
        );
    END IF;

    -- State Machine Guard: Must be in ASSIGNED status
    IF v_current_status <> 'ASSIGNED' THEN
        RAISE EXCEPTION 'Tag Activation Error: Tag % in state % cannot be activated.', v_serial_code, v_current_status USING ERRCODE = '42P01';
    END IF;

    -- Activate Tag
    UPDATE tags
    SET status = 'ACTIVE'::tag_status_enum,
        activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_tag_id;

    -- Insert Audit Event
    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        v_effective_user_id, 'HOUSEHOLD', 'TAG_ACTIVATED_BY_HOUSEHOLD', 'tags', p_tag_id::text, p_idempotency_key,
        jsonb_build_object('household_id', v_household_id, 'serial_code', v_serial_code)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'tag_id', p_tag_id,
        'new_status', 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
