-- ============================================================
-- NIRMALTAG ITERATION 1.6 DATABASE SECURITY HARDENING MIGRATION
-- Enforcement: Cryptographic Auth Context, Role Boundary Guards,
-- Impersonation Prevention & Strict RLS Policies
-- Migration Version: 20261003000005
-- ============================================================

-- 1. Helper function to extract authenticated JWT subject (Firebase UID) safely
CREATE OR REPLACE FUNCTION get_auth_jwt_sub() RETURNS UUID AS $$
DECLARE
    v_sub TEXT;
BEGIN
    v_sub := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
    IF v_sub IS NOT NULL AND v_sub ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN v_sub::UUID;
    END IF;
    RETURN auth.uid();
EXCEPTION WHEN OTHERS THEN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Hardened Tag Lifecycle Transition (Prevents Role & Profile Impersonation)
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
    v_has_role BOOLEAN := FALSE;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();
    
    -- Enforce Authenticated Context: Client CANNOT submit arbitrary actor UUID
    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_actor_id := v_authenticated_uid;
    ELSIF p_actor_profile_id IS NOT NULL THEN
        v_effective_actor_id := p_actor_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated tag state transition request.' USING ERRCODE = '42501';
    END IF;

    -- Enforce Database Role Truth: Client CANNOT submit arbitrary p_actor_role
    IF p_actor_role IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = v_effective_actor_id
              AND (r.name = p_actor_role OR r.name = 'SYSTEM_ADMIN')
        ) INTO v_has_role;

        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Access Denied: Account % is not assigned role %.', v_effective_actor_id, p_actor_role USING ERRCODE = '42501';
        END IF;
        v_effective_role := p_actor_role;
    ELSE
        SELECT r.name INTO v_effective_role
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_effective_actor_id
        LIMIT 1;

        v_effective_role := COALESCE(v_effective_role, 'AUTHENTICATED_USER');
    END IF;

    SELECT status, serial_code INTO v_current_status, v_serial_code
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
        actor_id,
        role,
        action,
        target_entity,
        target_id,
        idempotency_key,
        metadata
    ) VALUES (
        v_effective_actor_id,
        v_effective_role,
        'TAG_STATE_TRANSITION',
        'tags',
        p_tag_id::text,
        p_idempotency_key,
        jsonb_build_object(
            'serial_code', v_serial_code,
            'previous_status', v_current_status,
            'new_status', p_new_status,
            'reason', p_reason
        )
    );

    RETURN p_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Hardened Server-Derived Pickup Finalization & Reward Transaction
CREATE OR REPLACE FUNCTION process_verified_pickup_transaction_v2(
    p_pickup_id UUID,
    p_tag_id UUID,
    p_collector_profile_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_authenticated_uid UUID;
    v_effective_collector_uid UUID;
    v_household_id UUID;
    v_collector_id UUID;
    v_credit_account_id UUID;
    v_incentive_account_id UUID;
    v_household_credit_amount NUMERIC;
    v_collector_incentive_amount NUMERIC;
    v_new_household_balance NUMERIC;
    v_new_collector_balance NUMERIC;
    v_is_collector BOOLEAN := FALSE;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();

    -- Impersonation Prevention: derive collector identity from auth context
    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_collector_uid := v_authenticated_uid;
    ELSIF p_collector_profile_id IS NOT NULL THEN
        v_effective_collector_uid := p_collector_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated pickup transaction request.' USING ERRCODE = '42501';
    END IF;

    -- Verify Collector Authorization in Database
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_effective_collector_uid
          AND r.name IN ('COLLECTOR', 'SYSTEM_ADMIN')
    ) INTO v_is_collector;

    IF NOT v_is_collector THEN
        RAISE EXCEPTION 'Access Denied: Account % is not an authorized COLLECTOR.', v_effective_collector_uid USING ERRCODE = '42501';
    END IF;

    -- 1. Idempotency Check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        IF EXISTS (SELECT 1 FROM credit_transactions WHERE idempotency_key = p_idempotency_key) THEN
            SELECT balance INTO v_new_household_balance FROM credit_accounts WHERE household_id = (SELECT current_assigned_household_id FROM tags WHERE id = p_tag_id);
            SELECT balance INTO v_new_collector_balance FROM collector_incentive_accounts WHERE collector_id = (SELECT id FROM collectors WHERE user_id = v_effective_collector_uid);
            RETURN jsonb_build_object(
                'status', 'ALREADY_PROCESSED',
                'household_balance', COALESCE(v_new_household_balance, 0),
                'collector_balance', COALESCE(v_new_collector_balance, 0)
            );
        END IF;
    END IF;

    -- 2. Server Reward Policy Lookup (Fails safely if policies table or key missing)
    SELECT value INTO v_household_credit_amount FROM reward_policies WHERE key = 'HOUSEHOLD_CREDIT_PER_PICKUP';
    SELECT value INTO v_collector_incentive_amount FROM reward_policies WHERE key = 'COLLECTOR_INCENTIVE_PER_PICKUP';

    IF v_household_credit_amount IS NULL OR v_collector_incentive_amount IS NULL THEN
        RAISE EXCEPTION 'Pickup Processing Error: Reward policies not configured in database.' USING ERRCODE = '42P01';
    END IF;

    -- 3. Derive Household Ownership directly from Tag Record
    SELECT current_assigned_household_id INTO v_household_id
    FROM tags WHERE id = p_tag_id FOR UPDATE;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Pickup Processing Error: Tag % is not assigned to any valid household.', p_tag_id USING ERRCODE = '42P01';
    END IF;

    -- 4. Derive Collector Entity
    SELECT id INTO v_collector_id FROM collectors WHERE user_id = v_effective_collector_uid;
    IF v_collector_id IS NULL THEN
        INSERT INTO collectors (user_id, collector_code)
        VALUES (v_effective_collector_uid, 'COL-' || SUBSTRING(v_effective_collector_uid::text, 1, 8))
        RETURNING id INTO v_collector_id;
    END IF;

    -- 5. Atomic Tag State Transition to CLOSED (Fails if illegal transition)
    PERFORM transition_tag_state(
        p_tag_id,
        'CLOSED'::tag_status_enum,
        v_effective_collector_uid,
        'COLLECTOR',
        'Verified pickup finalization',
        p_idempotency_key
    );

    -- 6. Update Pickup Record
    UPDATE pickups
    SET status = 'VERIFIED'::pickup_status_enum,
        ai_verification_status = 'VERIFIED'::ai_verification_status_enum,
        verified_at = NOW()
    WHERE id = p_pickup_id;

    -- 7. Household Credit Posting
    SELECT id INTO v_credit_account_id FROM credit_accounts WHERE household_id = v_household_id FOR UPDATE;
    IF v_credit_account_id IS NULL THEN
        INSERT INTO credit_accounts (household_id, balance)
        VALUES (v_household_id, v_household_credit_amount)
        RETURNING id, balance INTO v_credit_account_id, v_new_household_balance;
    ELSE
        UPDATE credit_accounts
        SET balance = balance + v_household_credit_amount, updated_at = NOW()
        WHERE id = v_credit_account_id
        RETURNING balance INTO v_new_household_balance;
    END IF;

    INSERT INTO credit_transactions (
        account_id, pickup_id, tx_type, amount, idempotency_key
    ) VALUES (
        v_credit_account_id, p_pickup_id, 'EARN'::credit_tx_type_enum, v_household_credit_amount, p_idempotency_key
    );

    -- 8. Collector Incentive Posting
    SELECT id INTO v_incentive_account_id FROM collector_incentive_accounts WHERE collector_id = v_collector_id FOR UPDATE;
    IF v_incentive_account_id IS NULL THEN
        INSERT INTO collector_incentive_accounts (collector_id, balance)
        VALUES (v_collector_id, v_collector_incentive_amount)
        RETURNING id, balance INTO v_incentive_account_id, v_new_collector_balance;
    ELSE
        UPDATE collector_incentive_accounts
        SET balance = balance + v_collector_incentive_amount, updated_at = NOW()
        WHERE id = v_incentive_account_id
        RETURNING balance INTO v_new_collector_balance;
    END IF;

    INSERT INTO collector_incentive_transactions (
        account_id, pickup_id, amount, idempotency_key
    ) VALUES (
        v_incentive_account_id, p_pickup_id, v_collector_incentive_amount, p_idempotency_key
    );

    -- 9. Audit Log
    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        v_effective_collector_uid, 'COLLECTOR', 'PICKUP_VERIFIED_AND_REWARDED', 'pickups', p_pickup_id::text, p_idempotency_key,
        jsonb_build_object('household_credit', v_household_credit_amount, 'collector_incentive', v_collector_incentive_amount)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'household_balance', v_new_household_balance,
        'collector_balance', v_new_collector_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Hardened Tag Batch Generation Procedure
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
    v_start_seq INT;
    v_serial_code VARCHAR;
    v_is_officer BOOLEAN := FALSE;
    i INT;
BEGIN
    v_authenticated_uid := get_auth_jwt_sub();

    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_officer_uid := v_authenticated_uid;
    ELSIF p_officer_profile_id IS NOT NULL THEN
        v_effective_officer_uid := p_officer_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated batch creation request.' USING ERRCODE = '42501';
    END IF;

    -- Verify Tag Officer / System Admin authorization
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_effective_officer_uid
          AND r.name IN ('TAG_OFFICER', 'MCD_OFFICER', 'SYSTEM_ADMIN')
    ) INTO v_is_officer;

    IF NOT v_is_officer THEN
        RAISE EXCEPTION 'Access Denied: Account % is not an authorized TAG_OFFICER.', v_effective_officer_uid USING ERRCODE = '42501';
    END IF;

    IF p_quantity <= 0 OR p_quantity > 5000 THEN
        RAISE EXCEPTION 'Tag Batch Error: Batch quantity must be between 1 and 5,000.';
    END IF;

    INSERT INTO tag_batches (
        batch_name, total_tags, created_by, organization_id, created_at
    ) VALUES (
        p_batch_name, p_quantity, v_effective_officer_uid, p_ward_id, NOW()
    ) RETURNING id INTO v_batch_id;

    v_start_seq := FLOOR(1000 + RANDOM() * 8000)::INT;

    FOR i IN 0..(p_quantity - 1) LOOP
        v_serial_code := 'NT-SAN-2026-' || (v_start_seq + i)::VARCHAR;
        INSERT INTO tags (
            serial_code, batch_id, status, created_at, updated_at
        ) VALUES (
            v_serial_code, v_batch_id, 'CREATED'::tag_status_enum, NOW(), NOW()
        ) ON CONFLICT (serial_code) DO NOTHING;
    END LOOP;

    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        v_effective_officer_uid, 'TAG_OFFICER', 'TAG_BATCH_CREATED', 'tag_batches', v_batch_id::text, p_idempotency_key,
        jsonb_build_object('batch_name', p_batch_name, 'total_tags', p_quantity, 'ward_id', p_ward_id)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'batch_id', v_batch_id,
        'batch_name', p_batch_name,
        'tags_created', p_quantity,
        'start_serial', 'NT-SAN-2026-' || v_start_seq::VARCHAR
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
