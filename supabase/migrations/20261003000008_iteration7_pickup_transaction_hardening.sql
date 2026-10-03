-- NIRMALTAG MIGRATION 0008: ITERATION 7 PICKUP TRANSACTION HARDENING
-- Authoritative, fail-closed, idempotent, role-guarded pickup finalization

-- 1. Update State Machine Validation to support direct pickup finalization from ACTIVE/SCANNED/PICKUP_PENDING/VERIFIED
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
    IF p_current_status = 'ACTIVE' AND p_new_status IN ('SCANNED', 'PICKUP_PENDING', 'VERIFIED', 'CLOSED', 'SUSPENDED', 'LOST', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'SCANNED' AND p_new_status IN ('PICKUP_PENDING', 'VERIFIED', 'CLOSED', 'REJECTED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'PICKUP_PENDING' AND p_new_status IN ('VERIFIED', 'CLOSED', 'REJECTED', 'DISPUTED') THEN RETURN TRUE; END IF;
    IF p_current_status = 'VERIFIED' AND p_new_status = 'CLOSED' THEN RETURN TRUE; END IF;
    IF p_current_status = 'SUSPENDED' AND p_new_status IN ('ACTIVE', 'INVALIDATED') THEN RETURN TRUE; END IF;
    IF p_current_status IN ('INVALIDATED', 'CLOSED', 'LOST', 'DAMAGED') AND p_new_status = 'REPLACED' THEN RETURN TRUE; END IF;

    -- ANY OTHER TRANSITION IS STRICTLY REJECTED
    RAISE EXCEPTION 'Tag State Machine Violation: Illegal transition from % to %.', p_current_status, p_new_status USING ERRCODE = '42P01';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Hardened Server-Derived Pickup Finalization & Reward Transaction Procedure
CREATE OR REPLACE FUNCTION process_verified_pickup_transaction_v2(
    p_pickup_id UUID,
    p_tag_id UUID,
    p_collector_profile_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_authenticated_uid UUID;
    v_effective_collector_uid UUID;
    v_tag_status tag_status_enum;
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

    -- Impersonation Prevention: derive collector identity strictly from auth context when present
    IF v_authenticated_uid IS NOT NULL THEN
        v_effective_collector_uid := v_authenticated_uid;
    ELSIF p_collector_profile_id IS NOT NULL THEN
        v_effective_collector_uid := p_collector_profile_id;
    ELSE
        RAISE EXCEPTION 'Access Denied: Unauthenticated pickup transaction request.' USING ERRCODE = '42501';
    END IF;

    -- Verify Collector Authorization in Database (COLLECTOR or SYSTEM_ADMIN)
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_effective_collector_uid
          AND r.name IN ('COLLECTOR', 'SYSTEM_ADMIN')
    ) INTO v_is_collector;

    IF NOT v_is_collector THEN
        RAISE EXCEPTION 'Access Denied: Account % is not an authorized COLLECTOR.', v_effective_collector_uid USING ERRCODE = '42501';
    END IF;

    -- 1. Idempotency Check (Check credit_transactions table for key)
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        IF EXISTS (SELECT 1 FROM credit_transactions WHERE idempotency_key = p_idempotency_key || '_hh') THEN
            SELECT current_balance INTO v_new_household_balance FROM credit_accounts WHERE household_id = (SELECT current_assigned_household_id FROM tags WHERE id = p_tag_id);
            SELECT current_balance_inr INTO v_new_collector_balance FROM collector_incentive_accounts WHERE collector_id = (SELECT id FROM collectors WHERE user_id = v_effective_collector_uid);
            RETURN jsonb_build_object(
                'status', 'ALREADY_PROCESSED',
                'household_balance', COALESCE(v_new_household_balance, 0),
                'collector_balance', COALESCE(v_new_collector_balance, 0)
            );
        END IF;
    END IF;

    -- 2. Server Reward Policy Lookup
    SELECT value INTO v_household_credit_amount FROM reward_policies WHERE key = 'HOUSEHOLD_CREDIT_PER_PICKUP';
    SELECT value INTO v_collector_incentive_amount FROM reward_policies WHERE key = 'COLLECTOR_INCENTIVE_PER_PICKUP';

    IF v_household_credit_amount IS NULL OR v_collector_incentive_amount IS NULL THEN
        RAISE EXCEPTION 'Pickup Processing Error: Reward policies not configured in database.' USING ERRCODE = '42P01';
    END IF;

    -- 3. Lock Tag & Check Eligibility
    SELECT current_assigned_household_id, status INTO v_household_id, v_tag_status
    FROM tags WHERE id = p_tag_id FOR UPDATE;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Pickup Processing Error: Tag % is not assigned to any valid household.', p_tag_id USING ERRCODE = '42P01';
    END IF;

    -- Enforce Tag State Eligibility (MUST BE ACTIVE, SCANNED, PICKUP_PENDING, or VERIFIED)
    IF v_tag_status NOT IN ('ACTIVE', 'SCANNED', 'PICKUP_PENDING', 'VERIFIED') THEN
        RAISE EXCEPTION 'Tag Pickup Ineligible: Tag % is in % status, which is not eligible for pickup finalization.', p_tag_id, v_tag_status USING ERRCODE = '42P01';
    END IF;

    -- 4. Derive Collector Entity
    SELECT id INTO v_collector_id FROM collectors WHERE user_id = v_effective_collector_uid;
    IF v_collector_id IS NULL THEN
        INSERT INTO collectors (user_id)
        VALUES (v_effective_collector_uid)
        RETURNING id INTO v_collector_id;
    END IF;

    -- 5. Atomic Tag State Transition to CLOSED
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
    SET status = 'VERIFIED'::pickup_status_enum
    WHERE id = p_pickup_id;

    -- 7. Household Credit Posting
    INSERT INTO credit_accounts (household_id, current_balance, total_earned)
    VALUES (v_household_id, 0, 0)
    ON CONFLICT (household_id) DO NOTHING;

    SELECT id INTO v_credit_account_id FROM credit_accounts WHERE household_id = v_household_id FOR UPDATE;

    UPDATE credit_accounts
    SET current_balance = current_balance + v_household_credit_amount,
        total_earned = total_earned + v_household_credit_amount,
        updated_at = NOW()
    WHERE id = v_credit_account_id
    RETURNING current_balance INTO v_new_household_balance;

    INSERT INTO credit_transactions (
        account_id, pickup_id, tx_type, amount, balance_after, idempotency_key, description
    ) VALUES (
        v_credit_account_id, p_pickup_id, 'EARN'::credit_tx_type_enum, v_household_credit_amount, v_new_household_balance, p_idempotency_key || '_hh', 'Verified pickup credit earn'
    );

    -- 8. Collector Incentive Posting
    INSERT INTO collector_incentive_accounts (collector_id, current_balance_inr, total_earned_inr)
    VALUES (v_collector_id, 0.00, 0.00)
    ON CONFLICT (collector_id) DO NOTHING;

    SELECT id INTO v_incentive_account_id FROM collector_incentive_accounts WHERE collector_id = v_collector_id FOR UPDATE;

    UPDATE collector_incentive_accounts
    SET current_balance_inr = current_balance_inr + v_collector_incentive_amount,
        total_earned_inr = total_earned_inr + v_collector_incentive_amount,
        updated_at = NOW()
    WHERE id = v_incentive_account_id
    RETURNING current_balance_inr INTO v_new_collector_balance;

    INSERT INTO collector_incentive_transactions (
        account_id, pickup_id, amount_inr, balance_after_inr, idempotency_key, description
    ) VALUES (
        v_incentive_account_id, p_pickup_id, v_collector_incentive_amount, v_new_collector_balance, p_idempotency_key || '_col', 'Verified pickup handling incentive'
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
