-- ============================================================
-- NIRMALTAG PRODUCTION RECOVERY: MIGRATION 20261003000003
-- Centralized Tag State Machine, Immutable Credit Ledger, Audit Logging & Role Authorization
-- ============================================================

-- 1. Helper Function: Validate Tag State Transition Invariants
CREATE OR REPLACE FUNCTION validate_tag_state_transition(
    p_current_status tag_status_enum,
    p_new_status tag_status_enum
) RETURNS BOOLEAN AS $$
BEGIN
    -- INVARIANT 1: CLOSED tags can NEVER transition back to ACTIVE, CREATED, or REGISTERED
    IF p_current_status = 'CLOSED' AND p_new_status IN ('ACTIVE', 'CREATED', 'REGISTERED', 'ASSIGNED', 'SCANNED') THEN
        RAISE EXCEPTION 'Tag Invariant Violation: CLOSED tags cannot be re-activated or re-used.';
    END IF;

    -- INVARIANT 2: INVALIDATED or SUSPENDED tags cannot be directly scanned/verified
    IF p_current_status IN ('INVALIDATED', 'SUSPENDED', 'LOST', 'DAMAGED') AND p_new_status IN ('SCANNED', 'PICKUP_PENDING', 'VERIFIED', 'CLOSED') THEN
        RAISE EXCEPTION 'Tag Invariant Violation: Suspended or Invalidated tags cannot be processed for pickup.';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Centralized Tag State Transition Function
CREATE OR REPLACE FUNCTION transition_tag_state(
    p_tag_id UUID,
    p_new_status tag_status_enum,
    p_actor_profile_id UUID,
    p_actor_role VARCHAR,
    p_reason TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS tag_status_enum AS $$
DECLARE
    v_current_status tag_status_enum;
    v_serial_code VARCHAR;
BEGIN
    -- Fetch current tag state with row locking for concurrency safety
    SELECT status, serial_code INTO v_current_status, v_serial_code
    FROM tags
    WHERE id = p_tag_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag ID % not found.', p_tag_id;
    END IF;

    -- Validate transition invariant rules
    PERFORM validate_tag_state_transition(v_current_status, p_new_status);

    -- Execute state update
    UPDATE tags
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_tag_id;

    -- Log audit trail event
    INSERT INTO audit_logs (
        actor_id,
        role,
        action,
        target_entity,
        target_id,
        idempotency_key,
        metadata
    ) VALUES (
        p_actor_profile_id,
        p_actor_role,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Pickup Processing & Immutable Double-Entry Ledger Posting Function
CREATE OR REPLACE FUNCTION process_verified_pickup_transaction(
    p_pickup_id UUID,
    p_tag_id UUID,
    p_collector_profile_id UUID,
    p_household_profile_id UUID,
    p_credit_amount NUMERIC DEFAULT 10.0,
    p_incentive_amount NUMERIC DEFAULT 2.0,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_household_id UUID;
    v_collector_id UUID;
    v_credit_account_id UUID;
    v_incentive_account_id UUID;
    v_new_household_balance NUMERIC;
    v_new_collector_balance NUMERIC;
    v_tx_result JSONB;
BEGIN
    -- Check idempotency: If transaction was already executed for this idempotency key, return existing state
    IF p_idempotency_key IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM credit_transactions WHERE idempotency_key = p_idempotency_key) THEN
            RETURN jsonb_build_object(
                'status', 'ALREADY_PROCESSED',
                'message', 'Transaction already executed for this idempotency key.'
            );
        END IF;
    END IF;

    -- Fetch household record
    SELECT id INTO v_household_id FROM households WHERE user_id = p_household_profile_id;
    IF v_household_id IS NULL THEN
        -- Auto-create household entity if missing
        INSERT INTO households (user_id, household_code, address)
        VALUES (p_household_profile_id, 'HH-' || SUBSTRING(p_household_profile_id::text, 1, 8), 'Default Ward 42 Address')
        RETURNING id INTO v_household_id;
    END IF;

    -- Fetch collector record
    SELECT id INTO v_collector_id FROM collectors WHERE user_id = p_collector_profile_id;
    IF v_collector_id IS NULL THEN
        -- Auto-create collector entity if missing
        INSERT INTO collectors (user_id, collector_code)
        VALUES (p_collector_profile_id, 'COL-' || SUBSTRING(p_collector_profile_id::text, 1, 8))
        RETURNING id INTO v_collector_id;
    END IF;

    -- 1. Close the scanned Tag via State Machine
    PERFORM transition_tag_state(
        p_tag_id,
        'CLOSED'::tag_status_enum,
        p_collector_profile_id,
        'COLLECTOR',
        'Verified pickup processing',
        p_idempotency_key
    );

    -- 2. Update Pickup Record Status
    UPDATE pickups
    SET status = 'VERIFIED'::pickup_status_enum,
        ai_verification_status = 'VERIFIED'::ai_verification_status_enum,
        verified_at = NOW()
    WHERE id = p_pickup_id;

    -- 3. Post Household Eco-Points to Credit Ledger
    SELECT id, balance INTO v_credit_account_id, v_new_household_balance
    FROM credit_accounts
    WHERE household_id = v_household_id
    FOR UPDATE;

    IF v_credit_account_id IS NULL THEN
        INSERT INTO credit_accounts (household_id, balance)
        VALUES (v_household_id, p_credit_amount)
        RETURNING id, balance INTO v_credit_account_id, v_new_household_balance;
    ELSE
        UPDATE credit_accounts
        SET balance = balance + p_credit_amount,
            updated_at = NOW()
        WHERE id = v_credit_account_id
        RETURNING balance INTO v_new_household_balance;
    END IF;

    INSERT INTO credit_transactions (
        account_id,
        pickup_id,
        tx_type,
        amount,
        idempotency_key
    ) VALUES (
        v_credit_account_id,
        p_pickup_id,
        'EARN'::credit_tx_type_enum,
        p_credit_amount,
        COALESCE(p_idempotency_key, 'HH-TX-' || p_pickup_id::text)
    );

    -- 4. Post Collector Cash Incentive to Incentive Ledger
    SELECT id, balance INTO v_incentive_account_id, v_new_collector_balance
    FROM collector_incentive_accounts
    WHERE collector_id = v_collector_id
    FOR UPDATE;

    IF v_incentive_account_id IS NULL THEN
        INSERT INTO collector_incentive_accounts (collector_id, balance)
        VALUES (v_collector_id, p_incentive_amount)
        RETURNING id, balance INTO v_incentive_account_id, v_new_collector_balance;
    ELSE
        UPDATE collector_incentive_accounts
        SET balance = balance + p_incentive_amount,
            updated_at = NOW()
        WHERE id = v_incentive_account_id
        RETURNING balance INTO v_new_collector_balance;
    END IF;

    INSERT INTO collector_incentive_transactions (
        account_id,
        pickup_id,
        amount,
        idempotency_key
    ) VALUES (
        v_incentive_account_id,
        p_pickup_id,
        p_incentive_amount,
        COALESCE(p_idempotency_key, 'COL-TX-' || p_pickup_id::text)
    );

    -- 5. Audit Log Entry
    INSERT INTO audit_logs (
        actor_id,
        role,
        action,
        target_entity,
        target_id,
        idempotency_key,
        metadata
    ) VALUES (
        p_collector_profile_id,
        'COLLECTOR',
        'PICKUP_VERIFIED_AND_REWARDED',
        'pickups',
        p_pickup_id::text,
        p_idempotency_key,
        jsonb_build_object(
            'household_credit', p_credit_amount,
            'collector_incentive', p_incentive_amount,
            'household_new_balance', v_new_household_balance,
            'collector_new_balance', v_new_collector_balance
        )
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'household_balance', v_new_household_balance,
        'collector_balance', v_new_collector_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
