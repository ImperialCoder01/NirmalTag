-- ============================================================
-- NIRMALTAG ITERATION 25 — POUCH REQUEST FULFILLMENT RPC
-- Allows Collectors, Tag Officers, and Admins to deliver pouch orders
-- and bind active scannable QR tags to households.
-- ============================================================

CREATE OR REPLACE FUNCTION fulfill_household_pouch_request(
    p_request_id UUID,
    p_tag_code TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_actor_profile_id UUID;
    v_actor_role VARCHAR(50);
    v_household_id UUID;
    v_resident_profile_id UUID;
    v_category_id UUID;
    v_category_code TEXT;
    v_tag_id UUID;
    v_existing_status VARCHAR(50);
    v_existing_household_id UUID;
    v_final_tag_code TEXT;
    v_current_pouch_status VARCHAR(50);
BEGIN
    -- 1. Identity & Role Verification
    v_actor_profile_id := get_authenticated_profile_id();
    IF v_actor_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated caller.' USING ERRCODE = '42501';
    END IF;

    SELECT r.name INTO v_actor_role
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_actor_profile_id
    LIMIT 1;

    IF v_actor_role IS NULL THEN
        SELECT role::text INTO v_actor_role FROM profiles WHERE id = v_actor_profile_id;
    END IF;

    IF v_actor_role NOT IN ('COLLECTOR', 'TAG_OFFICER', 'RWA_ADMIN', 'SYSTEM_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Role % is not authorized to fulfill pouch orders.', COALESCE(v_actor_role, 'UNKNOWN') USING ERRCODE = '42501';
    END IF;

    -- 2. Retrieve Pouch Request Record
    SELECT household_id, waste_category_id, status INTO v_household_id, v_category_id, v_current_pouch_status
    FROM pouch_requests
    WHERE id = p_request_id;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Pouch Request Not Found: %', p_request_id USING ERRCODE = '22023';
    END IF;

    -- Idempotency check: if already DELIVERED, return success cleanly without re-executing mutations
    IF v_current_pouch_status = 'DELIVERED' THEN
        SELECT canonical_code INTO v_final_tag_code
        FROM tags t
        JOIN pouch_requests pr ON t.id = ANY(pr.allocated_tag_ids)
        WHERE pr.id = p_request_id LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'requestId', p_request_id,
            'status', 'DELIVERED',
            'allocatedTagCode', v_final_tag_code,
            'message', 'Pouch request was already fulfilled (idempotent).'
        );
    END IF;

    SELECT user_id INTO v_resident_profile_id FROM households WHERE id = v_household_id;
    SELECT code INTO v_category_code FROM waste_categories WHERE id = v_category_id;

    -- 3. Tag Allocation & Eligibility Checks
    IF p_tag_code IS NOT NULL AND p_tag_code <> '' THEN
        v_final_tag_code := UPPER(TRIM(p_tag_code));

        SELECT id, status, current_assigned_household_id INTO v_tag_id, v_existing_status, v_existing_household_id 
        FROM tags WHERE canonical_code = v_final_tag_code;

        IF v_tag_id IS NOT NULL THEN
            -- Invariant Rule: Rejects CLOSED, ACTIVE, INVALIDATED, or LOST tags
            IF v_existing_status IN ('CLOSED', 'ACTIVE', 'INVALIDATED', 'LOST') THEN
                RAISE EXCEPTION 'Invalid Tag State: Tag % is in % status and cannot be reassigned.', v_final_tag_code, v_existing_status USING ERRCODE = '22023';
            END IF;

            -- Invariant Rule: Rejects tag already assigned to another household
            IF v_existing_household_id IS NOT NULL AND v_existing_household_id <> v_household_id THEN
                RAISE EXCEPTION 'Household Mismatch: Tag % is assigned to another household.', v_final_tag_code USING ERRCODE = '22023';
            END IF;

            UPDATE tags
            SET status = 'ASSIGNED',
                current_assigned_household_id = v_household_id,
                updated_at = NOW()
            WHERE id = v_tag_id;
        ELSE
            -- Create new assigned tag entry
            INSERT INTO tags (
                canonical_code, qr_token, waste_category_id, status, current_assigned_household_id
            ) VALUES (
                v_final_tag_code, v_final_tag_code, v_category_id, 'ASSIGNED', v_household_id
            ) RETURNING id INTO v_tag_id;
        END IF;
    ELSE
        -- Auto-allocate existing IN_INVENTORY tag
        SELECT id, canonical_code INTO v_tag_id, v_final_tag_code
        FROM tags
        WHERE waste_category_id = v_category_id AND status = 'IN_INVENTORY'
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_tag_id IS NOT NULL THEN
            UPDATE tags
            SET status = 'ASSIGNED',
                current_assigned_household_id = v_household_id,
                updated_at = NOW()
            WHERE id = v_tag_id;
        END IF;
    END IF;

    -- 4. Update Pouch Request Status
    UPDATE pouch_requests
    SET status = 'DELIVERED',
        allocated_tag_ids = CASE WHEN v_tag_id IS NOT NULL THEN ARRAY[v_tag_id] ELSE allocated_tag_ids END,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- 5. Send In-App Notification to Resident
    IF v_resident_profile_id IS NOT NULL THEN
        INSERT INTO in_app_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (
            v_resident_profile_id,
            'Pouch Order Delivered',
            'Your pouch request has been fulfilled' || CASE WHEN v_final_tag_code IS NOT NULL THEN ' with Tag #' || v_final_tag_code ELSE '' END || '. You can now schedule doorstep pickups.',
            'POUCH_REQUEST',
            'pouch_requests',
            p_request_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'requestId', p_request_id,
        'status', 'DELIVERED',
        'allocatedTagCode', v_final_tag_code,
        'message', 'Pouch request fulfilled successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION fulfill_household_pouch_request(UUID, TEXT) TO authenticated;
