-- =============================================================================
-- LEAVE & ATTENDANCE SCHEMA - HRMS Application v1.0
-- =============================================================================
-- Contains: Leave Management, Attendance, Shifts, Overtime, Holidays
-- Dependencies: 01_org_schema.sql (tenants, employees, tenant_locations)
-- =============================================================================

-- =============================================================================
-- SECTION 1: ENUM TYPES (Leave & Attendance Related)
-- =============================================================================

CREATE TYPE leave_balance_type AS ENUM ('accrual', 'lump_sum', 'unlimited');
CREATE TYPE leave_request_type AS ENUM ('full_day', 'first_half', 'second_half', 'hourly');
CREATE TYPE leave_carry_forward_rule AS ENUM ('none', 'capped', 'unlimited', 'encash');
CREATE TYPE shift_type AS ENUM ('fixed', 'flexible', 'rotational');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'holiday', 'week_off', 'on_leave', 'late', 'early_departure', 'overtime');
CREATE TYPE overtime_approval AS ENUM ('pending', 'approved', 'rejected');

-- Domain-specific approval status enums (replacing generic approval_status)
CREATE TYPE leave_request_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn');
CREATE TYPE attendance_correction_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn', 'expired');
CREATE TYPE leave_encashment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'processing', 'disbursed', 'failed');

-- Shift rostering enums
CREATE TYPE shift_pattern_frequency AS ENUM ('daily', 'weekly', 'bi_weekly', 'monthly', 'custom');
CREATE TYPE shift_roster_status AS ENUM ('draft', 'published', 'locked', 'archived');

-- =============================================================================
-- SECTION 2: LEAVE MANAGEMENT
-- =============================================================================

-- Leave types
CREATE TABLE leave_types (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(128)    NOT NULL,
    code                VARCHAR(64)     NOT NULL,
    description         TEXT,
    paid                BOOLEAN         NOT NULL DEFAULT true,
    affects_attendance  BOOLEAN         NOT NULL DEFAULT true,
    count_weekly_offs   BOOLEAN         NOT NULL DEFAULT false,
    count_holidays      BOOLEAN         NOT NULL DEFAULT false,
    balance_type        leave_balance_type NOT NULL DEFAULT 'accrual',
    min_duration_days   NUMERIC(5,2)    DEFAULT 0.5,
    max_duration_days   NUMERIC(5,2),
    max_consecutive_days NUMERIC(5,2),
    require_attachment  BOOLEAN         NOT NULL DEFAULT false,
    require_approval    BOOLEAN         NOT NULL DEFAULT true,
    allow_negative_balance BOOLEAN      NOT NULL DEFAULT false,
    encashable          BOOLEAN         NOT NULL DEFAULT false,
    carry_forward       leave_carry_forward_rule NOT NULL DEFAULT 'none',
    carry_forward_limit NUMERIC(5,2),
    accrual_rate_monthly NUMERIC(5,2),
    max_balance         NUMERIC(5,2),
    applicable_after_days INTEGER       DEFAULT 0,
    gender_specific     VARCHAR(32),
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    CONSTRAINT chk_leave_type_gender CHECK (gender_specific IN ('male', 'female', 'all', NULL))
);

CREATE INDEX idx_leave_types_tenant ON leave_types(tenant_id, deleted_at);

-- Leave policies
CREATE TABLE leave_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    description         TEXT,
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    is_default          BOOLEAN         NOT NULL DEFAULT false,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_leave_policies_tenant ON leave_policies(tenant_id) WHERE deleted_at IS NULL;

-- Leave policy rules
CREATE TABLE leave_policy_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id           UUID            NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    leave_type_id       UUID            NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    annual_quota        NUMERIC(5,2)    NOT NULL DEFAULT 0,
    accrual_frequency   VARCHAR(32)     DEFAULT 'monthly',
    proration_enabled   BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(policy_id, leave_type_id),
    CONSTRAINT chk_leave_policy_accrual CHECK (accrual_frequency IN ('monthly', 'quarterly', 'yearly', 'joining_date'))
);

CREATE INDEX idx_leave_policy_rules_policy ON leave_policy_rules(policy_id);

-- Employee leave policy assignment
CREATE TABLE employee_leave_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    policy_id           UUID            NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_leave_policies_emp ON employee_leave_policies(employee_id, effective_from);

-- Leave balances
CREATE TABLE leave_balances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id       UUID            NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year                INTEGER         NOT NULL,
    opening_balance     NUMERIC(8,2)    NOT NULL DEFAULT 0,
    accrued             NUMERIC(8,2)    NOT NULL DEFAULT 0,
    used                NUMERIC(8,2)    NOT NULL DEFAULT 0,
    encashed            NUMERIC(8,2)    NOT NULL DEFAULT 0,
    lapsed              NUMERIC(8,2)    NOT NULL DEFAULT 0,
    carried_forward     NUMERIC(8,2)    NOT NULL DEFAULT 0,
    current_balance     NUMERIC(8,2)    GENERATED ALWAYS AS (
        opening_balance + accrued + carried_forward - used - encashed - lapsed
    ) STORED,
    last_accrual_date   DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(employee_id, leave_type_id, year),
    CONSTRAINT chk_leave_balance_tenant_consistency
        CHECK (tenant_id = (SELECT tenant_id FROM employees WHERE id = employee_id))
);

CREATE INDEX idx_leave_balances_tenant ON leave_balances(tenant_id, year);
CREATE INDEX idx_leave_balances_emp ON leave_balances(tenant_id, employee_id, year);
CREATE INDEX idx_leave_balances_type ON leave_balances(leave_type_id, year);

-- Leave requests
CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID                NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   UUID                NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date      DATE                NOT NULL,
    end_date        DATE                NOT NULL,
    request_type    leave_request_type  NOT NULL DEFAULT 'full_day',
    total_days      NUMERIC(5,2)        NOT NULL,
    reason          TEXT                NOT NULL,
    status          leave_request_status NOT NULL DEFAULT 'pending',
    approved_by     UUID                REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    cancelled_by    UUID                REFERENCES employees(id),
    cancelled_at    TIMESTAMPTZ,
    cancellation_reason TEXT,
    metadata        JSONB               NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX idx_leave_requests_emp ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_requests_org_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(employee_id, start_date, end_date);
CREATE INDEX idx_leave_requests_approver ON leave_requests(approved_by, status);

-- Leave attachments
CREATE TABLE leave_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID        NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT         NOT NULL,
    file_size_bytes BIGINT,
    mime_type       VARCHAR(128),
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_leave_attachments_request ON leave_attachments(leave_request_id);

-- Holidays
CREATE TABLE holidays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id     UUID         REFERENCES tenant_locations(id),
    country_id      UUID         REFERENCES countries(id),
    name            VARCHAR(255) NOT NULL,
    holiday_date    DATE         NOT NULL,
    is_floating     BOOLEAN      NOT NULL DEFAULT false,
    is_restricted   BOOLEAN      NOT NULL DEFAULT false,
    description     TEXT,
    repeats_yearly  BOOLEAN      NOT NULL DEFAULT true,
    applicable_to   TEXT[],
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, location_id, holiday_date, name)
);

CREATE INDEX idx_holidays_org_date ON holidays(tenant_id, holiday_date);
CREATE INDEX idx_holidays_org_location ON holidays(tenant_id, location_id, holiday_date);

-- Leave encashment
CREATE TABLE leave_encashments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    leave_type_id   UUID            NOT NULL REFERENCES leave_types(id),
    leave_balance_id UUID           REFERENCES leave_balances(id),
    days_encashed   NUMERIC(8,2)    NOT NULL,
    rate_per_day    NUMERIC(18,2)   NOT NULL,
    total_amount    NUMERIC(18,2)   NOT NULL,
    currency_code   VARCHAR(3)      NOT NULL,
    tds_amount      NUMERIC(18,2)   DEFAULT 0,
    net_amount      NUMERIC(18,2)   GENERATED ALWAYS AS (total_amount - COALESCE(tds_amount, 0)) STORED,
    status          leave_encashment_status NOT NULL DEFAULT 'pending',
    approved_by     UUID            REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    payment_date    DATE,
    payroll_run_id  UUID            REFERENCES payroll_runs(id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT fk_leave_encashments_payroll_run
        FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE SET NULL
);

CREATE INDEX idx_leave_encashments_emp ON leave_encashments(employee_id, status);
CREATE INDEX idx_leave_encashments_payroll_run ON leave_encashments(payroll_run_id)
    WHERE payroll_run_id IS NOT NULL;

-- =============================================================================
-- SECTION 3: ATTENDANCE & TIMESHEET
-- =============================================================================

-- Shifts
CREATE TABLE shifts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)  NOT NULL,
    code                VARCHAR(64),
    shift_type          shift_type    NOT NULL DEFAULT 'fixed',
    start_time          TIME          NOT NULL,
    end_time            TIME          NOT NULL,
    break_start         TIME,
    break_end           TIME,
    total_work_minutes  INTEGER       GENERATED ALWAYS AS (
        CASE 
            WHEN end_time >= start_time 
            THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
            ELSE EXTRACT(EPOCH FROM (end_time - start_time + INTERVAL '24 hours')) / 60
        END
    ) STORED,
    grace_period_minutes INTEGER      DEFAULT 0,
    half_day_threshold_minutes INTEGER DEFAULT 240,
    weekly_off_days     INTEGER[]     DEFAULT ARRAY[0, 6],
    is_night_shift      BOOLEAN       NOT NULL DEFAULT false,
    status              VARCHAR(50)   DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id) WHERE deleted_at IS NULL;

-- Employee shift assignments
CREATE TABLE employee_shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id        UUID         NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    effective_from  DATE         NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_shifts_emp ON employee_shifts(employee_id, effective_from);
CREATE INDEX idx_employee_shifts_shift ON employee_shifts(shift_id);

-- =============================================================================
-- SECTION 3A: SHIFT ROSTERING & PATTERNS
-- =============================================================================

-- Shift patterns (reusable rotation templates)
CREATE TABLE shift_patterns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    description         TEXT,
    frequency           shift_pattern_frequency NOT NULL DEFAULT 'weekly',
    cycle_length_days   INTEGER         NOT NULL DEFAULT 7,
    is_default          BOOLEAN         NOT NULL DEFAULT false,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    CONSTRAINT chk_cycle_length CHECK (cycle_length_days > 0 AND cycle_length_days <= 365)
);

CREATE INDEX idx_shift_patterns_tenant ON shift_patterns(tenant_id, status);

-- Shift pattern details (sequence of shifts within a pattern)
CREATE TABLE shift_pattern_details (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id          UUID            NOT NULL REFERENCES shift_patterns(id) ON DELETE CASCADE,
    day_number          INTEGER         NOT NULL,
    shift_id            UUID            REFERENCES shifts(id) ON DELETE SET NULL,
    is_off_day          BOOLEAN         NOT NULL DEFAULT false,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(pattern_id, day_number),
    CONSTRAINT chk_day_number CHECK (day_number >= 1),
    CONSTRAINT chk_shift_or_off CHECK (
        (shift_id IS NOT NULL AND is_off_day = false) OR
        (shift_id IS NULL AND is_off_day = true)
    )
);

CREATE INDEX idx_shift_pattern_details_pattern ON shift_pattern_details(pattern_id, day_number);

-- Shift rosters (published shift schedules for specific periods)
CREATE TABLE shift_rosters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    location_id         UUID            REFERENCES tenant_locations(id),
    department_id       UUID            REFERENCES departments(id),
    start_date          DATE            NOT NULL,
    end_date            DATE            NOT NULL,
    status              shift_roster_status NOT NULL DEFAULT 'draft',
    published_at        TIMESTAMPTZ,
    published_by        UUID            REFERENCES employees(id),
    locked_at           TIMESTAMPTZ,
    locked_by           UUID            REFERENCES employees(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_roster_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_shift_rosters_tenant ON shift_rosters(tenant_id, start_date, end_date);
CREATE INDEX idx_shift_rosters_location ON shift_rosters(location_id, start_date);
CREATE INDEX idx_shift_rosters_status ON shift_rosters(status, start_date);

-- Shift roster assignments (daily shift assignments for employees)
CREATE TABLE shift_roster_assignments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_id           UUID            NOT NULL REFERENCES shift_rosters(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_date     DATE            NOT NULL,
    shift_id            UUID            REFERENCES shifts(id) ON DELETE SET NULL,
    is_off_day          BOOLEAN         NOT NULL DEFAULT false,
    is_swap_request     BOOLEAN         NOT NULL DEFAULT false,
    swapped_with        UUID            REFERENCES employees(id),
    swap_approved_by    UUID            REFERENCES employees(id),
    swap_approved_at    TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(roster_id, employee_id, assignment_date),
    CONSTRAINT chk_shift_or_off_assignment CHECK (
        (shift_id IS NOT NULL AND is_off_day = false) OR
        (shift_id IS NULL AND is_off_day = true)
    )
);

CREATE INDEX idx_shift_roster_assignments_roster ON shift_roster_assignments(roster_id, assignment_date);
CREATE INDEX idx_shift_roster_assignments_emp ON shift_roster_assignments(employee_id, assignment_date);
CREATE INDEX idx_shift_roster_assignments_shift ON shift_roster_assignments(shift_id, assignment_date);

-- Employee shift pattern assignments (for automated roster generation)
CREATE TABLE employee_shift_patterns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pattern_id          UUID            NOT NULL REFERENCES shift_patterns(id) ON DELETE CASCADE,
    start_date          DATE            NOT NULL,
    end_date            DATE,
    cycle_start_day     INTEGER         NOT NULL DEFAULT 1,
    is_active           BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_pattern_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_cycle_start_day CHECK (cycle_start_day >= 1)
);

CREATE INDEX idx_employee_shift_patterns_emp ON employee_shift_patterns(employee_id, start_date);
CREATE INDEX idx_employee_shift_patterns_pattern ON employee_shift_patterns(pattern_id);
CREATE INDEX idx_employee_shift_patterns_active ON employee_shift_patterns(is_active, start_date);
-- =============================================================================
-- SECTION 4: ATTENDANCE & TIMESHEET
-- =============================================================================


-- Attendance records
CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID              NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id        UUID              REFERENCES shifts(id),
    attendance_date DATE              NOT NULL,
    clock_in        TIMESTAMPTZ,
    clock_out       TIMESTAMPTZ,
    total_minutes   INTEGER,
    break_minutes   INTEGER           DEFAULT 0,
    work_minutes    INTEGER           GENERATED ALWAYS AS (COALESCE(total_minutes, 0) - COALESCE(break_minutes, 0)) STORED,
    status          attendance_status NOT NULL DEFAULT 'present',
    is_late         BOOLEAN           NOT NULL DEFAULT false,
    late_by_minutes INTEGER           DEFAULT 0,
    is_early_departure BOOLEAN        NOT NULL DEFAULT false,
    early_by_minutes INTEGER          DEFAULT 0,
    overtime_minutes INTEGER          DEFAULT 0,
    remarks         TEXT,
    is_manual_entry BOOLEAN           NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX idx_attendance_records_emp ON attendance_records(employee_id, attendance_date DESC);
CREATE INDEX idx_attendance_records_org_date ON attendance_records(tenant_id, attendance_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status, attendance_date);

-- Attendance corrections
CREATE TABLE attendance_corrections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id   UUID            NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    old_clock_in    TIMESTAMPTZ,
    old_clock_out   TIMESTAMPTZ,
    new_clock_in    TIMESTAMPTZ,
    new_clock_out   TIMESTAMPTZ,
    reason          TEXT            NOT NULL,
    status          attendance_correction_status NOT NULL DEFAULT 'pending',
    approved_by     UUID            REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_corrections_emp ON attendance_corrections(employee_id, status);
CREATE INDEX idx_attendance_corrections_status ON attendance_corrections(status, created_at);

-- Overtime records
CREATE TABLE overtime_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID              NOT NULL REFERENCES tenants(id),
    employee_id     UUID              NOT NULL REFERENCES employees(id),
    ot_date         DATE              NOT NULL,
    start_time      TIMESTAMPTZ       NOT NULL,
    end_time        TIMESTAMPTZ       NOT NULL,
    total_minutes   INTEGER           NOT NULL,
    currency_code   VARCHAR(3)        NOT NULL,
    ot_rate_multiplier NUMERIC(5,3)   NOT NULL DEFAULT 1.5,
    is_compensatory BOOLEAN           NOT NULL DEFAULT false,
    compensatory_leave_days NUMERIC(5,2),
    status          overtime_approval NOT NULL DEFAULT 'pending',
    approved_by     UUID              REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    payroll_run_id  UUID              REFERENCES payroll_runs(id) ON DELETE SET NULL,
    remarks         TEXT,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    CONSTRAINT fk_overtime_records_payroll_run
        FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE SET NULL
);

CREATE INDEX idx_overtime_records_emp ON overtime_records(employee_id, ot_date);
CREATE INDEX idx_overtime_records_date ON overtime_records(ot_date);
CREATE INDEX idx_overtime_records_status ON overtime_records(status, ot_date);
CREATE INDEX idx_overtime_records_payroll_run ON overtime_records(payroll_run_id)
    WHERE payroll_run_id IS NOT NULL;

-- Biometric log
CREATE TABLE biometric_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id),
    employee_id     UUID         REFERENCES employees(id),
    device_id       VARCHAR(128),
    device_name     VARCHAR(255),
    punch_time      TIMESTAMPTZ  NOT NULL,
    punch_type      VARCHAR(16)  NOT NULL,
    is_processed    BOOLEAN      NOT NULL DEFAULT false,
    processed_at    TIMESTAMPTZ,
    attendance_id   UUID         REFERENCES attendance_records(id),
    raw_data        JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_biometric_punch_type CHECK (punch_type IN ('IN', 'OUT', 'BREAK_IN', 'BREAK_OUT'))
);

CREATE INDEX idx_biometric_logs_emp ON biometric_logs(employee_id, punch_time);
CREATE INDEX idx_biometric_logs_date ON biometric_logs(punch_time);
CREATE INDEX idx_biometric_logs_processed ON biometric_logs(is_processed) WHERE NOT is_processed;

-- =============================================================================
-- END OF LEAVE & ATTENDANCE SCHEMA
-- =============================================================================
