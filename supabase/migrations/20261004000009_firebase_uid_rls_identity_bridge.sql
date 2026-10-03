-- ============================================================
-- NIRMALTAG PRODUCTION IDENTITY BRIDGE: MIGRATION 20261004000009
-- Firebase Third-Party Auth -> Supabase PostgreSQL RLS Bridge (Approach B)
-- Non-invasive Application-Level Firebase Identity Bridge
-- Leaves native Supabase auth.uid() 100% UNTOUCHED
-- ============================================================

-- ------------------------------------------------------------
-- 1. CENTRALIZED FIREBASE IDENTITY HELPER FUNCTIONS
-- ------------------------------------------------------------

-- Extract authenticated Firebase UID string directly from JWT claims without UUID casting
CREATE OR REPLACE FUNCTION get_authenticated_firebase_uid() RETURNS TEXT AS $$
DECLARE
    v_claims JSONB;
    v_sub TEXT;
BEGIN
    BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
        v_sub := v_claims ->> 'sub';
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    RETURN NULLIF(v_sub, '');
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Resolve authenticated profiles.id (UUID) from Firebase UID string
CREATE OR REPLACE FUNCTION get_authenticated_profile_id() RETURNS UUID AS $$
DECLARE
    v_firebase_uid TEXT;
    v_profile_id UUID;
BEGIN
    v_firebase_uid := get_authenticated_firebase_uid();
    IF v_firebase_uid IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_profile_id
    FROM profiles
    WHERE firebase_uid = v_firebase_uid AND is_active = TRUE;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Hardened JWT subject helper (replaces native auth.uid fallback with get_authenticated_profile_id)
CREATE OR REPLACE FUNCTION get_auth_jwt_sub() RETURNS UUID AS $$
BEGIN
    RETURN get_authenticated_profile_id();
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Role authorization helper using Firebase UID mapping
CREATE OR REPLACE FUNCTION has_role(p_role user_role_enum) RETURNS BOOLEAN AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    v_profile_id := get_authenticated_profile_id();
    IF v_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_profile_id AND r.name = p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 2. HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- Replaces all auth.uid() references with get_authenticated_firebase_uid() / get_authenticated_profile_id()
-- ------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT USING (firebase_uid = get_authenticated_firebase_uid() OR has_role('SYSTEM_ADMIN'));

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (firebase_uid = get_authenticated_firebase_uid());

-- USER ROLES
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own roles" ON user_roles;
CREATE POLICY "Users view own roles" ON user_roles
    FOR SELECT USING (user_id = get_authenticated_profile_id() OR has_role('SYSTEM_ADMIN'));

-- HOUSEHOLDS
DROP POLICY IF EXISTS "Households view own data" ON households;
CREATE POLICY "Households view own data" ON households
    FOR SELECT USING (
        user_id = get_authenticated_profile_id()
        OR has_role('RWA_ADMIN') OR has_role('BWG_ADMIN') OR has_role('MCD_OFFICER') OR has_role('SYSTEM_ADMIN')
    );

-- COLLECTORS
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collectors view own data" ON collectors;
CREATE POLICY "Collectors view own data" ON collectors
    FOR SELECT USING (
        user_id = get_authenticated_profile_id()
        OR has_role('MCD_OFFICER') OR has_role('SYSTEM_ADMIN')
    );

-- TAGS
DROP POLICY IF EXISTS "Households view assigned tags" ON tags;
CREATE POLICY "Households view assigned tags" ON tags
    FOR SELECT USING (
        current_assigned_household_id IN (
            SELECT h.id FROM households h WHERE h.user_id = get_authenticated_profile_id()
        )
        OR has_role('COLLECTOR')
        OR has_role('TAG_OFFICER')
        OR has_role('MCD_OFFICER')
        OR has_role('SYSTEM_ADMIN')
    );

-- TAG BATCHES
ALTER TABLE tag_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authorized users view tag_batches" ON tag_batches;
CREATE POLICY "Authorized users view tag_batches" ON tag_batches
    FOR SELECT USING (
        has_role('COLLECTOR') OR has_role('TAG_OFFICER') OR has_role('MCD_OFFICER') OR has_role('SYSTEM_ADMIN')
    );

-- PICKUPS
DROP POLICY IF EXISTS "Collectors create pickups" ON pickups;
CREATE POLICY "Collectors create pickups" ON pickups
    FOR INSERT WITH CHECK (
        collector_id IN (
            SELECT c.id FROM collectors c WHERE c.user_id = get_authenticated_profile_id()
        )
    );

DROP POLICY IF EXISTS "Users view authorized pickups" ON pickups;
CREATE POLICY "Users view authorized pickups" ON pickups
    FOR SELECT USING (
        collector_id IN (SELECT c.id FROM collectors c WHERE c.user_id = get_authenticated_profile_id())
        OR household_id IN (SELECT h.id FROM households h WHERE h.user_id = get_authenticated_profile_id())
        OR has_role('MCD_OFFICER')
        OR has_role('RWA_ADMIN')
        OR has_role('BWG_ADMIN')
        OR has_role('SYSTEM_ADMIN')
    );

-- CREDIT LEDGER
DROP POLICY IF EXISTS "Households view own credit account" ON credit_accounts;
CREATE POLICY "Households view own credit account" ON credit_accounts
    FOR SELECT USING (
        household_id IN (
            SELECT h.id FROM households h WHERE h.user_id = get_authenticated_profile_id()
        )
        OR has_role('SYSTEM_ADMIN')
    );

DROP POLICY IF EXISTS "Households view own credit transactions" ON credit_transactions;
CREATE POLICY "Households view own credit transactions" ON credit_transactions
    FOR SELECT USING (
        account_id IN (
            SELECT ca.id FROM credit_accounts ca 
            JOIN households h ON ca.household_id = h.id 
            WHERE h.user_id = get_authenticated_profile_id()
        )
        OR has_role('SYSTEM_ADMIN')
    );

-- COLLECTOR INCENTIVE ACCOUNT & TRANSACTIONS
ALTER TABLE collector_incentive_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collectors view own incentive account" ON collector_incentive_accounts;
CREATE POLICY "Collectors view own incentive account" ON collector_incentive_accounts
    FOR SELECT USING (
        collector_id IN (
            SELECT c.id FROM collectors c WHERE c.user_id = get_authenticated_profile_id()
        )
        OR has_role('SYSTEM_ADMIN')
    );

ALTER TABLE collector_incentive_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collectors view own incentive transactions" ON collector_incentive_transactions;
CREATE POLICY "Collectors view own incentive transactions" ON collector_incentive_transactions
    FOR SELECT USING (
        account_id IN (
            SELECT cia.id FROM collector_incentive_accounts cia
            JOIN collectors c ON cia.collector_id = c.id
            WHERE c.user_id = get_authenticated_profile_id()
        )
        OR has_role('SYSTEM_ADMIN')
    );

-- MUNICIPAL & GEOGRAPHIC SCHEMAS (Read access for authenticated app users)
ALTER TABLE mcd_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view mcd_zones" ON mcd_zones;
CREATE POLICY "Anyone can view mcd_zones" ON mcd_zones FOR SELECT USING (true);

ALTER TABLE mcd_wards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view mcd_wards" ON mcd_wards;
CREATE POLICY "Anyone can view mcd_wards" ON mcd_wards FOR SELECT USING (true);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view organizations" ON organizations;
CREATE POLICY "Anyone can view organizations" ON organizations FOR SELECT USING (true);

-- AUDIT LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own audit logs" ON audit_logs;
CREATE POLICY "Users view own audit logs" ON audit_logs
    FOR SELECT USING (
        actor_id = get_authenticated_profile_id()
        OR has_role('SYSTEM_ADMIN')
    );
