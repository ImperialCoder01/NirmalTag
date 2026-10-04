-- ============================================================
-- NIRMALTAG ITERATION 19 — FULL OPERATIONAL LOOP MIGRATION
-- Migration Version: 20261004200000_iteration19_full_operational_loop.sql
-- Household Pouch Requests, Pickup Scheduling, Time Slots,
-- Collector Jobs, Notifications, and Dispute Resolution Schema
-- ============================================================

-- 1. POUCH REQUESTS TABLE
CREATE TABLE IF NOT EXISTS pouch_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
    waste_category_id UUID REFERENCES waste_categories(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0 AND quantity <= 10),
    status VARCHAR(50) DEFAULT 'REQUESTED' NOT NULL, -- 'REQUESTED', 'APPROVED', 'TAG_ALLOCATED', 'POUCH_ISSUED', 'HOUSEHOLD_RECEIVED', 'ACTIVATED', 'CANCELLED'
    allocated_tag_ids UUID[] DEFAULT '{}'::uuid[],
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    issued_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pouch_requests_household ON pouch_requests(household_id);
CREATE INDEX IF NOT EXISTS idx_pouch_requests_status ON pouch_requests(status);

-- 2. PICKUP SLOT CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS pickup_slot_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_id UUID REFERENCES mcd_wards(id) ON DELETE CASCADE NOT NULL,
    service_date DATE NOT NULL,
    time_window VARCHAR(50) NOT NULL, -- e.g., '09:00–11:00', '11:00–13:00', '14:00–16:00', '16:00–18:00'
    max_capacity INTEGER DEFAULT 5 NOT NULL CHECK (max_capacity > 0),
    booked_count INTEGER DEFAULT 0 NOT NULL CHECK (booked_count >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(ward_id, service_date, time_window)
);

CREATE INDEX IF NOT EXISTS idx_slots_ward_date ON pickup_slot_configurations(ward_id, service_date);

-- 3. PICKUP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS pickup_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE RESTRICT NOT NULL,
    tag_id UUID REFERENCES tags(id) ON DELETE RESTRICT NOT NULL,
    waste_category_id UUID REFERENCES waste_categories(id) ON DELETE RESTRICT NOT NULL,
    pickup_date DATE NOT NULL,
    time_window VARCHAR(50) NOT NULL,
    pickup_address_ref TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'REQUESTED' NOT NULL, -- 'DRAFT', 'REQUESTED', 'CONFIRMED', 'ASSIGNED', 'COLLECTOR_EN_ROUTE', 'ARRIVED', 'SCANNED', 'PICKUP_PENDING', 'VERIFIED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'MISSED', 'EXPIRED', 'DISPUTED'
    assigned_collector_id UUID REFERENCES collectors(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    rescheduled_from_id UUID REFERENCES pickup_requests(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_requests_household ON pickup_requests(household_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_tag ON pickup_requests(tag_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_collector ON pickup_requests(assigned_collector_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_date_window ON pickup_requests(pickup_date, time_window);

-- 4. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'POUCH_REQUEST', 'PICKUP_SCHEDULED', 'PICKUP_COMPLETED', 'CREDIT_AWARDED', 'JOB_ASSIGNED', 'PICKUP_CANCELLED'
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON in_app_notifications(user_id, is_read);

-- 5. DISPUTES TABLE
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE RESTRICT NOT NULL,
    pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE SET NULL,
    tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
    dispute_type VARCHAR(100) NOT NULL, -- 'MISSED_PICKUP', 'WRONG_TAG', 'UNEARNED_CREDIT', 'DAMAGED_POUCH', 'OTHER'
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN' NOT NULL, -- 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'
    resolution_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- 6. RPC PROCEDURES FOR OPERATIONAL LOOP
-- ------------------------------------------------------------

-- RPC A: Request Pouch
CREATE OR REPLACE FUNCTION request_household_pouch(
    p_category_code TEXT,
    p_quantity INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
    v_profile_id UUID;
    v_household_id UUID;
    v_category_id UUID;
    v_request_id UUID;
    v_assigned_tag_id UUID;
    v_tag_code TEXT;
BEGIN
    v_profile_id := get_authenticated_profile_id();
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated pouch request.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_household_id FROM households WHERE user_id = v_profile_id;
    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Account is not a registered household.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_category_id FROM waste_categories WHERE code = p_category_code;
    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Invalid Waste Category: %', p_category_code USING ERRCODE = '22023';
    END IF;

    -- Create Pouch Request Entry
    INSERT INTO pouch_requests (
        household_id, waste_category_id, quantity, status
    ) VALUES (
        v_household_id, v_category_id, COALESCE(p_quantity, 1), 'REQUESTED'
    ) RETURNING id INTO v_request_id;

    -- Attempt to auto-allocate an available IN_INVENTORY tag for this category if present
    SELECT id, canonical_code INTO v_assigned_tag_id, v_tag_code
    FROM tags
    WHERE waste_category_id = v_category_id AND status = 'IN_INVENTORY'
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_assigned_tag_id IS NOT NULL THEN
        UPDATE tags
        SET status = 'ASSIGNED',
            current_assigned_household_id = v_household_id,
            updated_at = NOW()
        WHERE id = v_assigned_tag_id;

        UPDATE pouch_requests
        SET status = 'TAG_ALLOCATED',
            allocated_tag_ids = ARRAY[v_assigned_tag_id],
            updated_at = NOW()
        WHERE id = v_request_id;
    END IF;

    -- Send Notification
    INSERT INTO in_app_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
        v_profile_id,
        'Pouch Order Received',
        'Your request for ' || p_category_code || ' waste pouch has been registered.',
        'POUCH_REQUEST',
        'pouch_requests',
        v_request_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'requestId', v_request_id,
        'status', CASE WHEN v_assigned_tag_id IS NOT NULL THEN 'TAG_ALLOCATED' ELSE 'REQUESTED' END,
        'allocatedTagCode', v_tag_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC B: Book Pickup Request with Atomic Capacity Locking
CREATE OR REPLACE FUNCTION book_pickup_appointment(
    p_tag_id UUID,
    p_pickup_date DATE,
    p_time_window TEXT
) RETURNS JSONB AS $$
DECLARE
    v_profile_id UUID;
    v_household_id UUID;
    v_ward_id UUID;
    v_address_ref TEXT;
    v_category_id UUID;
    v_tag_status tag_status_enum;
    v_collector_id UUID;
    v_slot_id UUID;
    v_current_booked INTEGER;
    v_max_capacity INTEGER;
    v_pickup_request_id UUID;
BEGIN
    v_profile_id := get_authenticated_profile_id();
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated booking request.' USING ERRCODE = '42501';
    END IF;

    SELECT id, ward_id, address_line1 INTO v_household_id, v_ward_id, v_address_ref
    FROM households WHERE user_id = v_profile_id;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Account is not a registered household.' USING ERRCODE = '42501';
    END IF;

    -- Validate Tag Ownership and Status
    SELECT waste_category_id, status INTO v_category_id, v_tag_status
    FROM tags
    WHERE id = p_tag_id AND current_assigned_household_id = v_household_id;

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Tag not owned by household.' USING ERRCODE = '42501';
    END IF;

    IF v_tag_status NOT IN ('ASSIGNED', 'ACTIVE') THEN
        RAISE EXCEPTION 'Tag Ineligible: Tag must be ASSIGNED or ACTIVE to book a pickup. Current status: %', v_tag_status USING ERRCODE = '22000';
    END IF;

    -- Ensure Slot Configuration exists and Lock Row for Atomic Capacity Check
    INSERT INTO pickup_slot_configurations (ward_id, service_date, time_window, max_capacity, booked_count)
    VALUES (v_ward_id, p_pickup_date, p_time_window, 5, 0)
    ON CONFLICT (ward_id, service_date, time_window) DO NOTHING;

    SELECT id, booked_count, max_capacity INTO v_slot_id, v_current_booked, v_max_capacity
    FROM pickup_slot_configurations
    WHERE ward_id = v_ward_id AND service_date = p_pickup_date AND time_window = p_time_window
    FOR UPDATE;

    IF v_current_booked >= v_max_capacity THEN
        RAISE EXCEPTION 'SLOT_FULL: Time slot % on % has reached maximum capacity (%/%).', p_time_window, p_pickup_date, v_current_booked, v_max_capacity USING ERRCODE = '22000';
    END IF;

    -- Find assigned collector for ward
    SELECT id INTO v_collector_id FROM collectors WHERE assigned_ward_id = v_ward_id AND is_active = TRUE LIMIT 1;

    -- Increment Slot Count
    UPDATE pickup_slot_configurations
    SET booked_count = booked_count + 1
    WHERE id = v_slot_id;

    -- Transition Tag to ACTIVE if it was ASSIGNED
    IF v_tag_status = 'ASSIGNED' THEN
        UPDATE tags SET status = 'ACTIVE', activated_at = NOW(), updated_at = NOW() WHERE id = p_tag_id;
    END IF;

    -- Create Pickup Request Entity
    INSERT INTO pickup_requests (
        household_id, tag_id, waste_category_id, pickup_date, time_window, pickup_address_ref, status, assigned_collector_id
    ) VALUES (
        v_household_id, p_tag_id, v_category_id, p_pickup_date, p_time_window, v_address_ref, 'ASSIGNED', v_collector_id
    ) RETURNING id INTO v_pickup_request_id;

    -- Send Household Notification
    INSERT INTO in_app_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
        v_profile_id,
        'Pickup Appointment Confirmed',
        'Pickup booked for ' || p_pickup_date || ' (' || p_time_window || ').',
        'PICKUP_SCHEDULED',
        'pickup_requests',
        v_pickup_request_id
    );

    -- Notify Collector if assigned
    IF v_collector_id IS NOT NULL THEN
        INSERT INTO in_app_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        SELECT user_id, 'New Pickup Job Assigned', 'New pickup scheduled at ' || v_address_ref || ' for ' || p_pickup_date || ' (' || p_time_window || ').', 'JOB_ASSIGNED', 'pickup_requests', v_pickup_request_id
        FROM collectors WHERE id = v_collector_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'pickupRequestId', v_pickup_request_id,
        'status', 'ASSIGNED',
        'pickupDate', p_pickup_date,
        'timeWindow', p_time_window
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC C: Cancel Pickup Appointment
CREATE OR REPLACE FUNCTION cancel_pickup_appointment(
    p_pickup_request_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by user'
) RETURNS JSONB AS $$
DECLARE
    v_profile_id UUID;
    v_household_id UUID;
    v_req_status VARCHAR(50);
    v_ward_id UUID;
    v_date DATE;
    v_time_window TEXT;
BEGIN
    v_profile_id := get_authenticated_profile_id();
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated request.' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_household_id FROM households WHERE user_id = v_profile_id;

    SELECT status, pickup_date, time_window, household_id INTO v_req_status, v_date, v_time_window, v_household_id
    FROM pickup_requests WHERE id = p_pickup_request_id;

    IF v_req_status IN ('COMPLETED', 'ARRIVED', 'SCANNED') THEN
        RAISE EXCEPTION 'Cannot Cancel: Pickup is already %.', v_req_status USING ERRCODE = '22000';
    END IF;

    -- Update Request Status
    UPDATE pickup_requests
    SET status = 'CANCELLED', cancellation_reason = p_reason, updated_at = NOW()
    WHERE id = p_pickup_request_id;

    -- Restore Slot Capacity
    SELECT ward_id INTO v_ward_id FROM households WHERE id = v_household_id;
    UPDATE pickup_slot_configurations
    SET booked_count = GREATEST(0, booked_count - 1)
    WHERE ward_id = v_ward_id AND service_date = v_date AND time_window = v_time_window;

    INSERT INTO in_app_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
    VALUES (
        v_profile_id,
        'Pickup Appointment Cancelled',
        'Your pickup appointment on ' || v_date || ' has been cancelled.',
        'PICKUP_CANCELLED',
        'pickup_requests',
        p_pickup_request_id
    );

    RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
