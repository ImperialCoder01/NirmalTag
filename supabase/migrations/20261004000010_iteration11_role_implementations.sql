-- ============================================================
-- NIRMALTAG ITERATION 11 — 7-ROLE CORE BUSINESS PROCEDURES & RLS POLICIES
-- Migration 20261004000010_iteration11_role_implementations.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. PHASE 1: HOUSEHOLD REWARD REDEMPTION PROCEDURE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION redeem_household_credits(
    p_reward_item_name text,
    p_credits_spent integer,
    p_idempotency_key text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_profile_id uuid;
    v_household_id uuid;
    v_credit_account_id uuid;
    v_current_balance integer;
    v_new_balance integer;
    v_redemption_id uuid;
    v_idempotency_key text;
BEGIN
    v_profile_id := get_authenticated_profile_id();
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated redemption request.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_household_id FROM households WHERE user_id = v_profile_id;
    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Account is not a registered household.' USING ERRCODE = '42501';
    END IF;

    IF p_credits_spent <= 0 THEN
        RAISE EXCEPTION 'Invalid Amount: Credits spent must be greater than zero.' USING ERRCODE = '42P01';
    END IF;

    v_idempotency_key := COALESCE(p_idempotency_key, 'RED-' || v_household_id || '-' || extract(epoch from now())::text);

    -- Idempotency Check
    IF EXISTS (SELECT 1 FROM redemption_requests WHERE idempotency_key = v_idempotency_key) THEN
        SELECT id INTO v_redemption_id FROM redemption_requests WHERE idempotency_key = v_idempotency_key;
        SELECT current_balance INTO v_current_balance FROM credit_accounts WHERE household_id = v_household_id;
        RETURN jsonb_build_object(
            'status', 'SUCCESS',
            'is_idempotent_retry', true,
            'redemption_id', v_redemption_id,
            'new_balance', v_current_balance
        );
    END IF;

    -- Lock credit account
    SELECT id, current_balance INTO v_credit_account_id, v_current_balance
    FROM credit_accounts
    WHERE household_id = v_household_id
    FOR UPDATE;

    IF v_credit_account_id IS NULL THEN
        RAISE EXCEPTION 'Credit Account Not Found for household.' USING ERRCODE = '42P01';
    END IF;

    IF v_current_balance < p_credits_spent THEN
        RAISE EXCEPTION 'Insufficient Credits: Account balance (%) is less than requested reward cost (%).', v_current_balance, p_credits_spent USING ERRCODE = '42P01';
    END IF;

    -- Deduct balance
    v_new_balance := v_current_balance - p_credits_spent;

    UPDATE credit_accounts
    SET current_balance = v_new_balance,
        total_redeemed = total_redeemed + p_credits_spent,
        updated_at = NOW()
    WHERE id = v_credit_account_id;

    -- Insert credit transaction
    INSERT INTO credit_transactions (
        account_id, tx_type, amount, balance_after, idempotency_key, description
    ) VALUES (
        v_credit_account_id, 'REDEEM'::credit_tx_type_enum, -p_credits_spent, v_new_balance, v_idempotency_key, 'Reward Redemption: ' || p_reward_item_name
    );

    -- Insert redemption request
    INSERT INTO redemption_requests (
        household_id, reward_item_name, credits_spent, status, idempotency_key
    ) VALUES (
        v_household_id, p_reward_item_name, p_credits_spent, 'FULFILLED', v_idempotency_key
    ) RETURNING id INTO v_redemption_id;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'redemption_id', v_redemption_id,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 2. PHASE 3: TAG REPLACEMENT WORKFLOW PROCEDURE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION replace_damaged_or_lost_tag(
    p_old_tag_id uuid,
    p_new_tag_id uuid,
    p_reason text,
    p_idempotency_key text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_officer_id uuid;
    v_household_id uuid;
    v_old_status tag_status_enum;
    v_new_status tag_status_enum;
    v_old_code text;
    v_new_code text;
BEGIN
    v_officer_id := get_authenticated_profile_id();
    IF v_officer_id IS NULL OR (NOT has_role('TAG_OFFICER') AND NOT has_role('SYSTEM_ADMIN')) THEN
        RAISE EXCEPTION 'Access Denied: Only Tag Officers can execute tag replacements.' USING ERRCODE = '42501';
    END IF;

    -- Lock old tag
    SELECT status, current_assigned_household_id, COALESCE(serial_code, canonical_code)
    INTO v_old_status, v_household_id, v_old_code
    FROM tags WHERE id = p_old_tag_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Original tag % not found.', p_old_tag_id;
    END IF;

    IF v_old_status = 'CLOSED' THEN
        RAISE EXCEPTION 'Invariant Violation: Cannot replace a CLOSED terminal tag.' USING ERRCODE = '42P01';
    END IF;

    -- Lock new tag
    SELECT status, COALESCE(serial_code, canonical_code)
    INTO v_new_status, v_new_code
    FROM tags WHERE id = p_new_tag_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Replacement tag % not found.', p_new_tag_id;
    END IF;

    IF v_new_status IN ('ASSIGNED', 'ACTIVE', 'SCANNED', 'PICKUP_PENDING', 'CLOSED', 'REPLACED') THEN
        RAISE EXCEPTION 'Replacement tag % is not in available inventory (Status: %).', v_new_code, v_new_status USING ERRCODE = '42P01';
    END IF;

    -- Mark old tag REPLACED
    UPDATE tags
    SET status = 'REPLACED'::tag_status_enum,
        updated_at = NOW()
    WHERE id = p_old_tag_id;

    -- Assign new tag to household
    UPDATE tags
    SET status = 'ASSIGNED'::tag_status_enum,
        current_assigned_household_id = v_household_id,
        updated_at = NOW()
    WHERE id = p_new_tag_id;

    -- Audit record
    INSERT INTO audit_logs (
        actor_id, action, target_entity, target_id, request_id, old_state, new_state
    ) VALUES (
        v_officer_id, 'TAG_REPLACED', 'tags', p_old_tag_id, p_idempotency_key,
        jsonb_build_object('old_tag_code', v_old_code, 'reason', p_reason),
        jsonb_build_object('new_tag_code', v_new_code, 'household_id', v_household_id)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'old_tag_code', v_old_code,
        'new_tag_code', v_new_code,
        'household_id', v_household_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 3. PHASE 5: BWG DAILY LOG TABLE & FUNCTION
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bwg_daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bwg_establishment_id UUID REFERENCES organizations(id),
    submitted_by UUID REFERENCES profiles(id),
    weight_kg NUMERIC(8, 2) NOT NULL CHECK (weight_kg > 0),
    category VARCHAR(100) NOT NULL,
    seal_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'VERIFIED' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE bwg_daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BWG Admins view own logs" ON bwg_daily_logs;
CREATE POLICY "BWG Admins view own logs" ON bwg_daily_logs
    FOR SELECT USING (
        has_role('BWG_ADMIN') OR has_role('SYSTEM_ADMIN') OR has_role('MCD_OFFICER')
    );

DROP POLICY IF EXISTS "BWG Admins insert own logs" ON bwg_daily_logs;
CREATE POLICY "BWG Admins insert own logs" ON bwg_daily_logs
    FOR INSERT WITH CHECK (
        has_role('BWG_ADMIN') OR has_role('SYSTEM_ADMIN')
    );

-- ------------------------------------------------------------
-- 4. RWA INCIDENT REPORTING TABLE & RLS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rwa_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rwa_org_id UUID REFERENCES organizations(id),
    household_id UUID REFERENCES households(id),
    reported_by UUID REFERENCES profiles(id),
    subject VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE rwa_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RWA view own incidents" ON rwa_incidents;
CREATE POLICY "RWA view own incidents" ON rwa_incidents
    FOR ALL USING (
        has_role('RWA_ADMIN') OR has_role('MCD_OFFICER') OR has_role('SYSTEM_ADMIN')
    );

-- ------------------------------------------------------------
-- 5. SYSTEM ADMIN USER ROLE PROVISIONING FUNCTION
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_user_role(
    p_target_profile_id uuid,
    p_role_name text
) RETURNS jsonb AS $$
DECLARE
    v_admin_id uuid;
    v_role_id uuid;
BEGIN
    v_admin_id := get_authenticated_profile_id();
    IF v_admin_id IS NULL OR NOT has_role('SYSTEM_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Only SYSTEM_ADMIN can assign user roles.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_role_id FROM roles WHERE name = p_role_name;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % does not exist in roles table.', p_role_name USING ERRCODE = '42P01';
    END IF;

    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (p_target_profile_id, v_role_id, v_admin_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    INSERT INTO audit_logs (
        actor_id, action, target_entity, target_id, new_state
    ) VALUES (
        v_admin_id, 'USER_ROLE_ASSIGNED', 'user_roles', p_target_profile_id,
        jsonb_build_object('assigned_role', p_role_name)
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'target_profile_id', p_target_profile_id,
        'assigned_role', p_role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
