-- ============================================================
-- NIRMALTAG MASTER DATABASE SCHEMA & SEED MIGRATION
-- Migration Version: 20261003000001
-- PostgreSQL / Supabase Schema Definition
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role_enum AS ENUM (
    'HOUSEHOLD',
    'COLLECTOR',
    'TAG_OFFICER',
    'RWA_ADMIN',
    'BWG_ADMIN',
    'MCD_OFFICER',
    'SYSTEM_ADMIN'
);

CREATE TYPE scope_type_enum AS ENUM (
    'OWN',
    'ORGANIZATION',
    'RWA',
    'BWG',
    'WARD',
    'ZONE',
    'CITY',
    'SYSTEM'
);

CREATE TYPE tag_status_enum AS ENUM (
    'CREATED',
    'REGISTERED',
    'IN_INVENTORY',
    'ASSIGNED',
    'ACTIVE',
    'SCANNED',
    'PICKUP_PENDING',
    'VERIFIED',
    'CLOSED',
    'SUSPENDED',
    'INVALIDATED',
    'LOST',
    'DAMAGED',
    'REPLACED'
);

CREATE TYPE pickup_status_enum AS ENUM (
    'PENDING',
    'VERIFIED',
    'REVIEW_REQUIRED',
    'REJECTED',
    'DISPUTED',
    'CLOSED'
);

CREATE TYPE ai_verification_status_enum AS ENUM (
    'VERIFIED',
    'REJECTED',
    'REVIEW_REQUIRED'
);

CREATE TYPE credit_tx_type_enum AS ENUM (
    'EARN',
    'REDEM',
    'ADJUST',
    'REVERSAL',
    'EXPIRY'
);

-- ------------------------------------------------------------
-- 1. AUTHENTICATION & ACCESS CONTROL TABLES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name user_role_enum UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id (Firebase UID string converted or mapped)
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, role_id)
);

-- ------------------------------------------------------------
-- 2. GEOGRAPHIC & MUNICIPAL ORGANIZATIONS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mcd_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_code VARCHAR(50) UNIQUE NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS mcd_wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES mcd_zones(id) ON DELETE CASCADE,
    ward_code VARCHAR(50) UNIQUE NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50) NOT NULL, -- 'RWA', 'BWG', 'MCD', 'RECYCLING_AGENCY'
    ward_id UUID REFERENCES mcd_wards(id),
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS rwas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    rwa_registration_number VARCHAR(100) UNIQUE NOT NULL,
    colony_name VARCHAR(255) NOT NULL,
    total_households INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bwgs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    facility_name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(100) NOT NULL, -- 'HOTEL', 'HOSPITAL', 'MALL', 'APARTMENT_COMPLEX'
    daily_waste_volume_kg NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------
-- 3. USER PROFILES BY ROLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    org_id UUID REFERENCES organizations(id),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    ward_id UUID REFERENCES mcd_wards(id),
    pincode VARCHAR(20) NOT NULL,
    credit_balance INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS collectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    org_id UUID REFERENCES organizations(id),
    assigned_ward_id UUID REFERENCES mcd_wards(id),
    incentive_balance_inr NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS officer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    org_id UUID REFERENCES organizations(id),
    badge_number VARCHAR(100) UNIQUE NOT NULL,
    assigned_scope scope_type_enum DEFAULT 'WARD' NOT NULL,
    assigned_ward_id UUID REFERENCES mcd_wards(id),
    assigned_zone_id UUID REFERENCES mcd_zones(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------
-- 4. WASTE CATEGORIES & CONFIGURATION
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS waste_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'SANITARY', 'DIAPER', 'INCONTINENCE', 'SMALL_MEDICAL', 'SPECIAL_CARE', 'OTHER_AUTHORIZED'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    credit_reward_points INTEGER DEFAULT 10 NOT NULL,
    collector_incentive_inr NUMERIC(6, 2) DEFAULT 2.00 NOT NULL,
    handling_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------
-- 5. TAG BATCHES & INVENTORY STATE MACHINE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tag_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    manufacturer_name VARCHAR(255),
    waste_category_id UUID REFERENCES waste_categories(id),
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    received_quantity INTEGER DEFAULT 0 NOT NULL,
    issuing_org_id UUID REFERENCES organizations(id),
    receiving_org_id UUID REFERENCES organizations(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Immutable UUID
    canonical_code VARCHAR(100) UNIQUE NOT NULL, -- Human readable code e.g. NMT-2026-000001
    qr_token VARCHAR(255) UNIQUE NOT NULL, -- QR Payload Token (Identifier only)
    batch_id UUID REFERENCES tag_batches(id) ON DELETE RESTRICT,
    waste_category_id UUID REFERENCES waste_categories(id),
    status tag_status_enum DEFAULT 'CREATED' NOT NULL,
    current_assigned_household_id UUID REFERENCES households(id),
    activated_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tags_canonical ON tags(canonical_code);
CREATE INDEX idx_tags_qr_token ON tags(qr_token);
CREATE INDEX idx_tags_status ON tags(status);

CREATE TABLE IF NOT EXISTS tag_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tag_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    previous_status tag_status_enum,
    new_status tag_status_enum NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    reason TEXT,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------
-- 6. PICKUP EVENTS & AI EVIDENCE VERIFICATION
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pickups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE RESTRICT,
    collector_id UUID REFERENCES collectors(id) ON DELETE RESTRICT,
    household_id UUID REFERENCES households(id) ON DELETE RESTRICT,
    status pickup_status_enum DEFAULT 'PENDING' NOT NULL,
    scan_timestamp TIMESTAMPTZ NOT NULL,
    evidence_timestamp TIMESTAMPTZ NOT NULL,
    submitted_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    server_received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    location_accuracy_meters NUMERIC(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pickups_tag ON pickups(tag_id);
CREATE INDEX idx_pickups_collector ON pickups(collector_id);
CREATE INDEX idx_pickups_idempotency ON pickups(idempotency_key);

CREATE TABLE IF NOT EXISTS pickup_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE,
    storage_path VARCHAR(512) NOT NULL,
    file_hash VARCHAR(128) NOT NULL, -- SHA-256 evidence integrity hash
    mime_type VARCHAR(50) DEFAULT 'image/jpeg' NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE UNIQUE,
    status ai_verification_status_enum NOT NULL,
    confidence_score NUMERIC(5, 4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version VARCHAR(50) NOT NULL,
    inference_timestamp TIMESTAMPTZ NOT NULL,
    observable_features_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id),
    previous_status pickup_status_enum NOT NULL,
    final_status pickup_status_enum NOT NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------
-- 7. DOUBLE-ENTRY CREDIT & INCENTIVE TRANSACTION LEDGERS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS credit_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE UNIQUE,
    current_balance INTEGER DEFAULT 0 NOT NULL CHECK (current_balance >= 0),
    total_earned INTEGER DEFAULT 0 NOT NULL,
    total_redeemed INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES credit_accounts(id) ON DELETE RESTRICT,
    pickup_id UUID REFERENCES pickups(id),
    tx_type credit_tx_type_enum NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    policy_version VARCHAR(50) DEFAULT 'v1.0' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS collector_incentive_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collector_id UUID REFERENCES collectors(id) ON DELETE CASCADE UNIQUE,
    current_balance_inr NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (current_balance_inr >= 0.00),
    total_earned_inr NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_withdrawn_inr NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS collector_incentive_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES collector_incentive_accounts(id) ON DELETE RESTRICT,
    pickup_id UUID REFERENCES pickups(id),
    amount_inr NUMERIC(10, 2) NOT NULL,
    balance_after_inr NUMERIC(12, 2) NOT NULL CHECK (balance_after_inr >= 0.00),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS redemption_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE RESTRICT,
    reward_item_name VARCHAR(255) NOT NULL,
    credits_spent INTEGER NOT NULL CHECK (credits_spent > 0),
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'APPROVED', 'FULFILLED', 'REJECTED'
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- 8. AUDIT LOGS & SECURITY EVENTS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id UUID,
    request_id VARCHAR(128),
    ip_address VARCHAR(45),
    old_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------
-- 9. DEFAULT SEED DATA
-- ------------------------------------------------------------

INSERT INTO roles (name, description) VALUES
    ('HOUSEHOLD', 'Household resident user for pouch segregation'),
    ('COLLECTOR', 'Waste collection worker with mobile scanner'),
    ('TAG_OFFICER', 'Authorized tag inventory and lifecycle management officer'),
    ('RWA_ADMIN', 'Resident Welfare Association administrator'),
    ('BWG_ADMIN', 'Bulk Waste Generator administrator'),
    ('MCD_OFFICER', 'Municipal Corporation of Delhi officer'),
    ('SYSTEM_ADMIN', 'Full system administrator')
ON CONFLICT (name) DO NOTHING;

INSERT INTO waste_categories (code, display_name, description, credit_reward_points, collector_incentive_inr) VALUES
    ('SANITARY', 'Sanitary Waste', 'Pads, tampons, and related personal sanitary items', 10, 2.00),
    ('DIAPER', 'Child & Adult Diapers', 'Used baby diapers and adult incontinence wear', 12, 2.50),
    ('INCONTINENCE', 'Incontinence Care', 'Medical incontinence sheets and liners', 10, 2.00),
    ('SMALL_MEDICAL', 'Small Household Medical', 'Expired medicines, bandages, non-sharp medical items', 15, 3.00),
    ('SPECIAL_CARE', 'Special Care Waste', 'Authorized bio-care and special disposal pouches', 15, 3.00),
    ('OTHER_AUTHORIZED', 'Other Authorized Waste', 'Other designated segregated waste pouches', 8, 1.50)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 10. ATOMIC PICKUP FINALIZATION FUNCTION & TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION finalize_pickup_transaction(
    p_pickup_id UUID,
    p_idempotency_key VARCHAR(128)
) RETURNS BOOLEAN AS $$
DECLARE
    v_tag_id UUID;
    v_household_id UUID;
    v_collector_id UUID;
    v_category_id UUID;
    v_tag_status tag_status_enum;
    v_reward_points INTEGER;
    v_incentive_inr NUMERIC(6, 2);
    v_hh_account_id UUID;
    v_col_account_id UUID;
    v_hh_balance INTEGER;
    v_col_balance NUMERIC(12, 2);
BEGIN
    -- Fetch pickup details
    SELECT tag_id, household_id, collector_id INTO v_tag_id, v_household_id, v_collector_id
    FROM pickups WHERE id = p_pickup_id;

    IF v_tag_id IS NULL THEN
        RAISE EXCEPTION 'Pickup event not found';
    END IF;

    -- Fetch and lock tag state
    SELECT status, waste_category_id INTO v_tag_status, v_category_id
    FROM tags WHERE id = v_tag_id FOR UPDATE;

    -- Invariant check: Tag must be ACTIVE or SCANNED, never CLOSED
    IF v_tag_status = 'CLOSED' THEN
        RAISE EXCEPTION 'Tag has already completed its single-use lifecycle and is CLOSED';
    END IF;

    -- Fetch reward values
    SELECT credit_reward_points, collector_incentive_inr INTO v_reward_points, v_incentive_inr
    FROM waste_categories WHERE id = v_category_id;

    -- 1. Close the single-use tag
    UPDATE tags 
    SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW() 
    WHERE id = v_tag_id;

    -- Record tag history
    INSERT INTO tag_status_history (tag_id, previous_status, new_status, reason, idempotency_key)
    VALUES (v_tag_id, v_tag_status, 'CLOSED', 'Pickup finalization successful', p_idempotency_key);

    -- 2. Household Credit Ledger Entry
    INSERT INTO credit_accounts (household_id, current_balance, total_earned)
    VALUES (v_household_id, 0, 0)
    ON CONFLICT (household_id) DO NOTHING;

    SELECT id, current_balance INTO v_hh_account_id, v_hh_balance
    FROM credit_accounts WHERE household_id = v_household_id FOR UPDATE;

    UPDATE credit_accounts
    SET current_balance = current_balance + v_reward_points,
        total_earned = total_earned + v_reward_points,
        updated_at = NOW()
    WHERE id = v_hh_account_id;

    INSERT INTO credit_transactions (
        account_id, pickup_id, tx_type, amount, balance_after, idempotency_key, description
    ) VALUES (
        v_hh_account_id, p_pickup_id, 'EARN', v_reward_points, v_hh_balance + v_reward_points,
        p_idempotency_key || '_hh', 'Verified pickup credit earn'
    );

    -- 3. Collector Incentive Ledger Entry
    INSERT INTO collector_incentive_accounts (collector_id, current_balance_inr, total_earned_inr)
    VALUES (v_collector_id, 0.00, 0.00)
    ON CONFLICT (collector_id) DO NOTHING;

    SELECT id, current_balance_inr INTO v_col_account_id, v_col_balance
    FROM collector_incentive_accounts WHERE collector_id = v_collector_id FOR UPDATE;

    UPDATE collector_incentive_accounts
    SET current_balance_inr = current_balance_inr + v_incentive_inr,
        total_earned_inr = total_earned_inr + v_incentive_inr,
        updated_at = NOW()
    WHERE id = v_col_account_id;

    INSERT INTO collector_incentive_transactions (
        account_id, pickup_id, amount_inr, balance_after_inr, idempotency_key, description
    ) VALUES (
        v_col_account_id, p_pickup_id, v_incentive_inr, v_col_balance + v_incentive_inr,
        p_idempotency_key || '_col', 'Verified pickup handling incentive'
    );

    -- Update pickup status to VERIFIED
    UPDATE pickups SET status = 'VERIFIED' WHERE id = p_pickup_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
