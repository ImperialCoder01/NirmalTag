-- ============================================================
-- NIRMALTAG ITERATION 1.5 DATABASE MIGRATION
-- Production Security Correction: Strict Tag State Machine, Policy Settings,
-- Server-Derived Pickup Transaction & Batch Generation
-- Migration Version: 20261003000004
-- ============================================================

-- 1. Reward Policy Configuration Table
CREATE TABLE IF NOT EXISTS reward_policies (
    key VARCHAR(100) PRIMARY KEY,
    value NUMERIC NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed production policy settings
INSERT INTO reward_policies (key, value, description) VALUES
('HOUSEHOLD_CREDIT_PER_PICKUP', 10.0, 'Eco-Points rewarded to household per verified pickup'),
('COLLECTOR_INCENTIVE_PER_PICKUP', 2.0, 'Handling incentive cash (INR) rewarded to collector per verified pickup')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable RLS on reward_policies
ALTER TABLE reward_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reward policies" ON reward_policies
    FOR SELECT USING (true);

CREATE POLICY "Only system admins update reward policies" ON reward_policies
    FOR ALL USING (has_role('SYSTEM_ADMIN'));

-- 2. Strict Tag Lifecycle State Machine Function (DEFAULT REJECT RULE)
CREATE OR REPLACE FUNCTION validate_tag_state_transition(
    p_current_status tag_status_enum,
    p_new_status tag_status_enum
) RETURNS BOOLEAN AS $$
BEGIN
    -- Same state transition is idempotent / no-op
    IF p_current_status = p_new_status THEN
        RETURN TRUE;
    END IF;

    -- EXPLICIT ALLOWED TRANSITION MATRIX:
    IF p_current_status = 'CREATED' AND p_new_status IN ('REGISTERED', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'REGISTERED' AND p_new_status IN ('IN_INVENTORY', 'ASSIGNED', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'IN_INVENTORY' AND p_new_status IN ('ASSIGNED', 'SUSPENDED', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'ASSIGNED' AND p_new_status IN ('ACTIVE', 'SUSPENDED', 'LOST', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'ACTIVE' AND p_new_status IN ('SCANNED', 'SUSPENDED', 'LOST', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'SCANNED' AND p_new_status IN ('PICKUP_PENDING', 'VERIFIED', 'REJECTED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'PICKUP_PENDING' AND p_new_status IN ('VERIFIED', 'REJECTED', 'DISPUTED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'VERIFIED' AND p_new_status = 'CLOSED' THEN RETURN TRUE; END IF;
    IF p_current_status = 'SUSPENDED' AND p_new_status IN ('ACTIVE', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status IN ('INVALIDATED', 'CLOSED', 'LOST', 'DAMAGED') AND p_new_status = 'REPLACED' THEN RETURN TRUE; END IF;

    -- ANY OTHER TRANSITION IS STRICTLY REJECTED
    RAISE EXCEPTION 'Tag State Machine Violation: Illegal transition from % to %.', p_current_status, p_new_status;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Transition Tag State Procedure (SECURITY DEFINER with safe search_path)
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
    SELECT status, serial_code INTO v_current_status, v_serial_code
    FROM tags
    WHERE id = p_tag_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag ID % not found.', p_tag_id;
    END IF;

    -- Strict validation (fails if transition not explicitly allowed)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Server-Derived Pickup Finalization & Reward Transaction
CREATE OR REPLACE FUNCTION process_verified_pickup_transaction_v2(
    p_pickup_id UUID,
    p_tag_id UUID,
    p_collector_profile_id UUID,
    p_idempotency_key VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_household_id UUID;
    v_household_user_id UUID;
    v_collector_id UUID;
    v_credit_account_id UUID;
    v_incentive_account_id UUID;
    v_household_credit_amount NUMERIC;
    v_collector_incentive_amount NUMERIC;
    v_new_household_balance NUMERIC;
    v_new_collector_balance NUMERIC;
BEGIN
    -- 1. Idempotency Check: Uniqueness guaranteed via idempotency_key
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        IF EXISTS (SELECT 1 FROM credit_transactions WHERE idempotency_key = p_idempotency_key) THEN
            SELECT balance INTO v_new_household_balance FROM credit_accounts WHERE household_id = (SELECT current_assigned_household_id FROM tags WHERE id = p_tag_id);
            SELECT balance INTO v_new_collector_balance FROM collector_incentive_accounts WHERE collector_id = (SELECT id FROM collectors WHERE user_id = p_collector_profile_id);
            RETURN jsonb_build_object(
                'status', 'ALREADY_PROCESSED',
                'household_balance', COALESCE(v_new_household_balance, 0),
                'collector_balance', COALESCE(v_new_collector_balance, 0)
            );
        END IF;
    END IF;

    -- 2. Derive Server-Authoritative Reward Policy (NO client-controlled amounts!)
    SELECT value INTO v_household_credit_amount FROM reward_policies WHERE key = 'HOUSEHOLD_CREDIT_PER_PICKUP';
    SELECT value INTO v_collector_incentive_amount FROM reward_policies WHERE key = 'COLLECTOR_INCENTIVE_PER_PICKUP';

    v_household_credit_amount := COALESCE(v_household_credit_amount, 10.0);
    v_collector_incentive_amount := COALESCE(v_collector_incentive_amount, 2.0);

    -- 3. Validate Tag and Derive Household Ownership (NO client-supplied household ID!)
    SELECT current_assigned_household_id INTO v_household_id
    FROM tags WHERE id = p_tag_id FOR UPDATE;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Pickup Processing Error: Tag % is not assigned to any valid household.', p_tag_id;
    END IF;

    SELECT user_id INTO v_household_user_id FROM households WHERE id = v_household_id;

    -- 4. Derive Collector Entity
    SELECT id INTO v_collector_id FROM collectors WHERE user_id = p_collector_profile_id;
    IF v_collector_id IS NULL THEN
        INSERT INTO collectors (user_id, collector_code)
        VALUES (p_collector_profile_id, 'COL-' || SUBSTRING(p_collector_profile_id::text, 1, 8))
        RETURNING id INTO v_collector_id;
    END IF;

    -- 5. Close Tag via State Machine (Fails atomically if tag is already CLOSED)
    PERFORM transition_tag_state(
        p_tag_id,
        'CLOSED'::tag_status_enum,
        p_collector_profile_id,
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

    -- 7. Immutable Household Credit Posting
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

    -- 8. Immutable Collector Incentive Posting
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

    -- 9. Record Audit Log
    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        p_collector_profile_id, 'COLLECTOR', 'PICKUP_VERIFIED_AND_REWARDED', 'pickups', p_pickup_id::text, p_idempotency_key,
        jsonb_build_object('household_credit', v_household_credit_amount, 'collector_incentive', v_collector_incentive_amount)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'household_balance', v_new_household_balance,
        'collector_balance', v_new_collector_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Production Tag Batch & Actual Tag Database Generation Procedure
CREATE OR REPLACE FUNCTION create_tag_batch_and_records(
    p_batch_name VARCHAR,
    p_quantity INT,
    p_ward_id UUID,
    p_officer_profile_id UUID,
    p_idempotency_key VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_batch_id UUID;
    v_start_seq INT;
    v_serial_code VARCHAR;
    i INT;
BEGIN
    IF p_quantity <= 0 OR p_quantity > 5000 THEN
        RAISE EXCEPTION 'Tag Batch Error: Batch quantity must be between 1 and 5,000.';
    END IF;

    -- Create Tag Batch Entry
    INSERT INTO tag_batches (
        batch_name, total_tags, created_by, organization_id, created_at
    ) VALUES (
        p_batch_name, p_quantity, p_officer_profile_id, p_ward_id, NOW()
    ) RETURNING id INTO v_batch_id;

    v_start_seq := FLOOR(1000 + RANDOM() * 8000)::INT;

    -- Generate actual database tag records
    FOR i IN 0..(p_quantity - 1) LOOP
        v_serial_code := 'NT-SAN-2026-' || (v_start_seq + i)::VARCHAR;
        INSERT INTO tags (
            serial_code, batch_id, status, created_at, updated_at
        ) VALUES (
            v_serial_code, v_batch_id, 'CREATED'::tag_status_enum, NOW(), NOW()
        ) ON CONFLICT (serial_code) DO NOTHING;
    END LOOP;

    -- Audit Log Entry
    INSERT INTO audit_logs (
        actor_id, role, action, target_entity, target_id, idempotency_key, metadata
    ) VALUES (
        p_officer_profile_id, 'TAG_OFFICER', 'TAG_BATCH_CREATED', 'tag_batches', v_batch_id::text, p_idempotency_key,
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
