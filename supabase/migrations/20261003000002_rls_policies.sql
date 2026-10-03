-- ============================================================
-- NIRMALTAG ROW LEVEL SECURITY (RLS) POLICIES
-- Migration Version: 20261003000002
-- PostgreSQL / Supabase Security Definitions
-- ============================================================

-- Enable RLS on all primary tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_incentive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_incentive_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current auth user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_role user_role_enum) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN profiles p ON ur.user_id = p.id
        WHERE p.firebase_uid = auth.uid()::text AND r.name = p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------

CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT USING (firebase_uid = auth.uid()::text OR has_role('SYSTEM_ADMIN'));

CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (firebase_uid = auth.uid()::text);

-- ------------------------------------------------------------
-- HOUSEHOLDS POLICIES
-- ------------------------------------------------------------

CREATE POLICY "Households view own data" ON households
    FOR SELECT USING (
        user_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
        OR has_role('RWA_ADMIN') OR has_role('BWG_ADMIN') OR has_role('MCD_OFFICER') OR has_role('SYSTEM_ADMIN')
    );

-- ------------------------------------------------------------
-- TAGS POLICIES
-- ------------------------------------------------------------

CREATE POLICY "Households view assigned tags" ON tags
    FOR SELECT USING (
        current_assigned_household_id IN (
            SELECT h.id FROM households h JOIN profiles p ON h.user_id = p.id WHERE p.firebase_uid = auth.uid()::text
        )
        OR has_role('COLLECTOR')
        OR has_role('TAG_OFFICER')
        OR has_role('MCD_OFFICER')
        OR has_role('SYSTEM_ADMIN')
    );

CREATE POLICY "Tag Officers insert and update tags" ON tags
    FOR ALL USING (has_role('TAG_OFFICER') OR has_role('SYSTEM_ADMIN'));

-- ------------------------------------------------------------
-- PICKUPS POLICIES
-- ------------------------------------------------------------

CREATE POLICY "Collectors create pickups" ON pickups
    FOR INSERT WITH CHECK (
        collector_id IN (
            SELECT c.id FROM collectors c JOIN profiles p ON c.user_id = p.id WHERE p.firebase_uid = auth.uid()::text
        )
    );

CREATE POLICY "Users view authorized pickups" ON pickups
    FOR SELECT USING (
        collector_id IN (SELECT c.id FROM collectors c JOIN profiles p ON c.user_id = p.id WHERE p.firebase_uid = auth.uid()::text)
        OR household_id IN (SELECT h.id FROM households h JOIN profiles p ON h.user_id = p.id WHERE p.firebase_uid = auth.uid()::text)
        OR has_role('MCD_OFFICER')
        OR has_role('RWA_ADMIN')
        OR has_role('BWG_ADMIN')
        OR has_role('SYSTEM_ADMIN')
    );

-- ------------------------------------------------------------
-- CREDIT LEDGER POLICIES
-- ------------------------------------------------------------

CREATE POLICY "Households view own credit account" ON credit_accounts
    FOR SELECT USING (
        household_id IN (
            SELECT h.id FROM households h JOIN profiles p ON h.user_id = p.id WHERE p.firebase_uid = auth.uid()::text
        )
        OR has_role('SYSTEM_ADMIN')
    );

CREATE POLICY "Households view own credit transactions" ON credit_transactions
    FOR SELECT USING (
        account_id IN (
            SELECT ca.id FROM credit_accounts ca 
            JOIN households h ON ca.household_id = h.id 
            JOIN profiles p ON h.user_id = p.id 
            WHERE p.firebase_uid = auth.uid()::text
        )
        OR has_role('SYSTEM_ADMIN')
    );

-- Prevent direct mutation of ledger entries via API
CREATE POLICY "No direct client inserts into credit transactions" ON credit_transactions
    FOR INSERT WITH CHECK (has_role('SYSTEM_ADMIN'));
