-- =============================================================================
-- PAYROLL SCHEMA - HRMS Application v1.0
-- =============================================================================
-- Contains: Salary Components, Payroll Processing, Tax Management, Compliance
-- Dependencies: 01_org_schema.sql, 02_leave_attendance_schema.sql
-- =============================================================================

-- =============================================================================
-- SECTION 1: ENUM TYPES (Payroll Related)
-- =============================================================================

CREATE TYPE component_type AS ENUM ('earning', 'deduction', 'reimbursement', 'benefit');
CREATE TYPE calculation_method AS ENUM ('flat', 'percentage', 'formula', 'tiered', 'attendance_based');
CREATE TYPE payroll_status AS ENUM ('draft', 'processing', 'verified', 'approved', 'paid', 'cancelled');
CREATE TYPE pay_frequency AS ENUM ('weekly', 'bi_weekly', 'semi_monthly', 'monthly', 'quarterly', 'annually');
CREATE TYPE compliance_category AS ENUM (
    'tax', 'social_security', 'labor_law', 'minimum_wage',
    'overtime_rules', 'leave_entitlement', 'statutory_bonus',
    'gratuity', 'pension', 'health_insurance', 'worker_compensation'
);
CREATE TYPE tax_regime AS ENUM ('old_regime', 'new_regime', 'default');

-- Pay calendar enums
CREATE TYPE pay_day_calculation AS ENUM (
    'fixed_date',           -- e.g., 25th of every month
    'last_day_of_month',    -- Last calendar day
    'last_working_day',     -- Last working day (excluding weekends/holidays)
    'first_working_day',    -- First working day of next month
    'nth_weekday'           -- e.g., 2nd Friday of month
);
CREATE TYPE pay_calendar_status AS ENUM ('draft', 'active', 'inactive', 'archived');

-- =============================================================================
-- SECTION 2: COMPLIANCE & STATUTORY
-- =============================================================================

-- Compliance rules
CREATE TABLE compliance_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id          UUID            NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    category            compliance_category NOT NULL,
    rule_name           VARCHAR(255)    NOT NULL,
    rule_code           VARCHAR(64)     NOT NULL,
    description         TEXT,
    rule_config         JSONB           NOT NULL DEFAULT '{}',
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    is_mandatory        BOOLEAN         NOT NULL DEFAULT true,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(country_id, rule_code, effective_from)
);

CREATE INDEX idx_compliance_rules_country ON compliance_rules(country_id, category, status);

-- Tenant compliance configuration
CREATE TABLE tenant_compliance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    compliance_rule_id  UUID    NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
    override_config     JSONB   NOT NULL DEFAULT '{}',
    is_enabled          BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, compliance_rule_id)
);

CREATE INDEX idx_tenant_compliance_tenant ON tenant_compliance(tenant_id, is_enabled);

-- Statutory contribution types
CREATE TABLE statutory_contribution_types (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id              UUID            NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name                    VARCHAR(255)    NOT NULL,
    code                    VARCHAR(64)     NOT NULL,
    description             TEXT,
    employee_pct            NUMERIC(8,4),
    employer_pct            NUMERIC(8,4),
    wage_ceiling            NUMERIC(18,2),
    min_wage_threshold      NUMERIC(18,2),
    calculation_basis       VARCHAR(128),
    currency_code           VARCHAR(3)      NOT NULL,
    config_schema           JSONB           NOT NULL DEFAULT '{}',
    status                  VARCHAR(50)     DEFAULT 'active',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(country_id, code)
);

CREATE INDEX idx_statutory_contribution_types_country ON statutory_contribution_types(country_id, status);

-- Tenant statutory contribution configuration
CREATE TABLE tenant_statutory_contributions (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contribution_type_id            UUID    NOT NULL REFERENCES statutory_contribution_types(id) ON DELETE CASCADE,
    employee_pct_override           NUMERIC(8,4),
    employer_pct_override           NUMERIC(8,4),
    wage_ceiling_override           NUMERIC(18,2),
    is_enabled                      BOOLEAN NOT NULL DEFAULT true,
    effective_from                  DATE    NOT NULL,
    effective_to                    DATE,
    config_overrides                JSONB   NOT NULL DEFAULT '{}',
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, contribution_type_id, effective_from)
);

CREATE INDEX idx_org_statutory_contrib_tenant ON tenant_statutory_contributions(tenant_id, is_enabled);

-- Tax brackets (country-specific)
CREATE TABLE tax_brackets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id      UUID            NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    regime_code     VARCHAR(64)     NOT NULL DEFAULT 'default',
    bracket_name    VARCHAR(255)    NOT NULL,
    min_income      NUMERIC(18,2)   NOT NULL,
    max_income      NUMERIC(18,2),
    tax_rate        NUMERIC(8,4)    NOT NULL,
    surcharge_rate  NUMERIC(8,4)    DEFAULT 0,
    cess_rate       NUMERIC(8,4)    DEFAULT 0,
    deduction_allowances JSONB      DEFAULT '{}',
    currency_code   VARCHAR(3)      NOT NULL,
    effective_from  DATE            NOT NULL,
    effective_to    DATE,
    status          VARCHAR(50)     DEFAULT 'active',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_brackets_country_regime ON tax_brackets(country_id, regime_code, effective_from, status);

-- =============================================================================
-- SECTION 3: SALARY COMPONENTS & STRUCTURES
-- =============================================================================

-- Salary components
CREATE TABLE salary_components (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64)     NOT NULL,
    component_type      component_type  NOT NULL DEFAULT 'earning',
    calculation_method  calculation_method NOT NULL DEFAULT 'flat',
    calculation_config  JSONB           NOT NULL DEFAULT '{}',
    is_taxable          BOOLEAN         NOT NULL DEFAULT false,
    is_statutory        BOOLEAN         NOT NULL DEFAULT false,
    affects_gross       BOOLEAN         NOT NULL DEFAULT false,
    affects_net         BOOLEAN         NOT NULL DEFAULT true,
    is_visible_on_payslip BOOLEAN       NOT NULL DEFAULT true,
    payslip_display_name VARCHAR(255),
    display_order       INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_salary_components_org ON salary_components(tenant_id, status);

-- Salary structures
CREATE TABLE salary_structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(64),
    description     TEXT,
    is_default      BOOLEAN      NOT NULL DEFAULT false,
    status          VARCHAR(50)  DEFAULT 'active',
    effective_from  DATE         NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_salary_structures_org ON salary_structures(tenant_id, status);

-- Salary structure components
CREATE TABLE salary_structure_components (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id        UUID            NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    component_id        UUID            NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
    calculation_order   INTEGER         NOT NULL DEFAULT 0,
    is_mandatory        BOOLEAN         NOT NULL DEFAULT true,
    default_value       NUMERIC(18,2),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(structure_id, component_id)
);

CREATE INDEX idx_salary_structure_components_structure ON salary_structure_components(structure_id);

-- Employee compensation
CREATE TABLE employee_compensation (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    salary_structure_id UUID            NOT NULL REFERENCES salary_structures(id),
    ctc_annual          NUMERIC(18,2)   NOT NULL,
    gross_monthly       NUMERIC(18,2)   NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    is_current          BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_compensation_emp ON employee_compensation(employee_id, is_current);
CREATE INDEX idx_employee_compensation_dates ON employee_compensation(effective_from, effective_to);

-- Employee salary components
CREATE TABLE employee_salary_components (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compensation_id     UUID            NOT NULL REFERENCES employee_compensation(id) ON DELETE CASCADE,
    component_id        UUID            NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
    monthly_amount      NUMERIC(18,2)   NOT NULL,
    annual_amount       NUMERIC(18,2)   NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(compensation_id, component_id)
);

CREATE INDEX idx_employee_salary_components_comp ON employee_salary_components(compensation_id);

-- =============================================================================
-- SECTION 4: PAYROLL PROCESSING
-- =============================================================================
-- Pay calendars (recurring pay schedule templates)
CREATE TABLE pay_calendars (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    description         TEXT,
    country_id          UUID            REFERENCES countries(id),
    location_id         UUID            REFERENCES tenant_locations(id),
    frequency           pay_frequency   NOT NULL DEFAULT 'monthly',
    pay_day_calculation pay_day_calculation NOT NULL DEFAULT 'last_working_day',
    pay_day_value       INTEGER,
    pay_day_weekday     INTEGER,
    pay_day_offset_days INTEGER         DEFAULT 0,
    period_start_day    INTEGER         DEFAULT 1,
    cutoff_day          INTEGER,
    cutoff_time         TIME,
    fiscal_year_start   VARCHAR(5)      DEFAULT '01-01',
    consider_holidays   BOOLEAN         NOT NULL DEFAULT true,
    consider_weekends   BOOLEAN         NOT NULL DEFAULT true,
    weekend_days        INTEGER[]       DEFAULT ARRAY[0, 6],
    is_default          BOOLEAN         NOT NULL DEFAULT false,
    status              pay_calendar_status NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    CONSTRAINT chk_pay_day_value CHECK (
        pay_day_value IS NULL OR 
        (pay_day_value >= 1 AND pay_day_value <= 31)
    ),
    CONSTRAINT chk_pay_day_weekday CHECK (
        pay_day_weekday IS NULL OR 
        (pay_day_weekday >= 0 AND pay_day_weekday <= 6)
    ),
    CONSTRAINT chk_period_start_day CHECK (
        period_start_day >= 1 AND period_start_day <= 31
    )
);

CREATE INDEX idx_pay_calendars_tenant ON pay_calendars(tenant_id, status);
CREATE INDEX idx_pay_calendars_country ON pay_calendars(country_id, status);
CREATE INDEX idx_pay_calendars_location ON pay_calendars(location_id, status);

-- Pay calendar rules (additional rules for specific scenarios)
CREATE TABLE pay_calendar_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id         UUID            NOT NULL REFERENCES pay_calendars(id) ON DELETE CASCADE,
    rule_name           VARCHAR(255)    NOT NULL,
    rule_type           VARCHAR(64)     NOT NULL,
    condition_json      JSONB           NOT NULL DEFAULT '{}',
    action_json         JSONB           NOT NULL DEFAULT '{}',
    priority            INTEGER         NOT NULL DEFAULT 0,
    is_active           BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_rule_type CHECK (rule_type IN (
        'date_adjustment',
        'period_extension',
        'period_split',
        'holiday_shift',
        'year_end_adjustment'
    ))
);

CREATE INDEX idx_pay_calendar_rules_calendar ON pay_calendar_rules(calendar_id, priority);

-- Employee pay calendar assignments
CREATE TABLE employee_pay_calendars (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    calendar_id         UUID            NOT NULL REFERENCES pay_calendars(id) ON DELETE CASCADE,
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    is_active           BOOLEAN         NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_pay_calendar_dates CHECK (
        effective_to IS NULL OR effective_to >= effective_from
    )
);

CREATE INDEX idx_employee_pay_calendars_emp ON employee_pay_calendars(employee_id, effective_from);
CREATE INDEX idx_employee_pay_calendars_calendar ON employee_pay_calendars(calendar_id);
CREATE UNIQUE INDEX idx_employee_pay_calendars_active ON employee_pay_calendars(employee_id)
    WHERE is_active = true;

-- =============================================================================
-- SECTION 5: PAYROLL PROCESSING
-- =============================================================================


-- Payroll periods
CREATE TABLE payroll_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pay_calendar_id UUID         REFERENCES pay_calendars(id) ON DELETE SET NULL,
    period_name     VARCHAR(128) NOT NULL,
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    pay_date        DATE         NOT NULL,
    frequency       pay_frequency NOT NULL DEFAULT 'monthly',
    is_closed       BOOLEAN      NOT NULL DEFAULT false,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, start_date, end_date)
);

CREATE INDEX idx_payroll_periods_org ON payroll_periods(tenant_id, start_date DESC);
CREATE INDEX idx_payroll_periods_calendar ON payroll_periods(pay_calendar_id);

-- Payroll runs (partitioned by run_date)
CREATE TABLE payroll_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payroll_period_id   UUID            NOT NULL REFERENCES payroll_periods(id),
    run_date            DATE            NOT NULL,
    run_name            VARCHAR(255)    NOT NULL,
    status              payroll_status  NOT NULL DEFAULT 'draft',
    currency_code       VARCHAR(3)      NOT NULL,
    total_employees     INTEGER         DEFAULT 0,
    total_gross         NUMERIC(18,2)   DEFAULT 0,
    total_deductions    NUMERIC(18,2)   DEFAULT 0,
    total_employer_contrib NUMERIC(18,2) DEFAULT 0,
    total_net_pay       NUMERIC(18,2)   DEFAULT 0,
    initiated_by        UUID            REFERENCES employees(id),
    verified_by         UUID            REFERENCES employees(id),
    verified_at         TIMESTAMPTZ,
    approved_by         UUID            REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,
    payment_reference   VARCHAR(255),
    notes               TEXT,
    metadata            JSONB           NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
) PARTITION BY RANGE (run_date);

CREATE INDEX idx_payroll_runs_org_period ON payroll_runs(tenant_id, payroll_period_id);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status, run_date);

CREATE TABLE payroll_runs_2024 PARTITION OF payroll_runs
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE payroll_runs_2025 PARTITION OF payroll_runs
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE payroll_runs_2026 PARTITION OF payroll_runs
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE payroll_runs_default PARTITION OF payroll_runs DEFAULT;

-- Payroll run details (partitioned)
CREATE TABLE payroll_run_details (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id      UUID            NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    salary_component_id UUID            NOT NULL REFERENCES salary_components(id),
    component_type      component_type  NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    amount              NUMERIC(18,2)   NOT NULL,
    is_arrears          BOOLEAN         NOT NULL DEFAULT false,
    arrears_for_period  UUID            REFERENCES payroll_periods(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_payroll_run_details_run ON payroll_run_details(payroll_run_id, employee_id);
CREATE INDEX idx_payroll_run_details_emp ON payroll_run_details(employee_id, created_at);

CREATE TABLE payroll_run_details_2024 PARTITION OF payroll_run_details
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE payroll_run_details_2025 PARTITION OF payroll_run_details
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE payroll_run_details_2026 PARTITION OF payroll_run_details
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE payroll_run_details_default PARTITION OF payroll_run_details DEFAULT;

-- Payroll run summary
CREATE TABLE payroll_run_summary (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id      UUID            NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    working_days        NUMERIC(5,2)    DEFAULT 0,
    paid_days           NUMERIC(5,2)    DEFAULT 0,
    leave_days          NUMERIC(5,2)    DEFAULT 0,
    loss_of_pay_days    NUMERIC(5,2)    DEFAULT 0,
    overtime_hours      NUMERIC(8,2)    DEFAULT 0,
    currency_code       VARCHAR(3)      NOT NULL,
    overtime_amount     NUMERIC(18,2)   DEFAULT 0,
    gross_earnings      NUMERIC(18,2)   DEFAULT 0,
    total_deductions    NUMERIC(18,2)   DEFAULT 0,
    statutory_deductions NUMERIC(18,2)  DEFAULT 0,
    tax_deducted        NUMERIC(18,2)   DEFAULT 0,
    net_pay             NUMERIC(18,2)   DEFAULT 0,
    employer_contributions NUMERIC(18,2) DEFAULT 0,
    bank_account_id     UUID            REFERENCES employee_bank_accounts(id),
    payment_status      VARCHAR(32)     DEFAULT 'pending',
    payment_reference   VARCHAR(255),
    remarks             TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(payroll_run_id, employee_id),
    CONSTRAINT chk_payroll_summary_payment_status CHECK (payment_status IN ('pending', 'processed', 'failed', 'paid', 'reversed'))
);

CREATE INDEX idx_payroll_run_summary_run ON payroll_run_summary(payroll_run_id);
CREATE INDEX idx_payroll_run_summary_emp ON payroll_run_summary(employee_id);
CREATE INDEX idx_payroll_run_summary_payment ON payroll_run_summary(payment_status, payroll_run_id);

-- =============================================================================
-- SECTION 5: LOANS & ADVANCES
-- =============================================================================

-- Loans and advances
CREATE TABLE loans_advances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id),
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    loan_type           VARCHAR(64)     NOT NULL DEFAULT 'advance',
    currency_code       VARCHAR(3)      NOT NULL,
    principal_amount    NUMERIC(18,2)   NOT NULL,
    interest_rate       NUMERIC(8,4)    DEFAULT 0,
    interest_amount     NUMERIC(18,2)   DEFAULT 0,
    total_amount        NUMERIC(18,2)   GENERATED ALWAYS AS (principal_amount + COALESCE(interest_amount, 0)) STORED,
    emi_amount          NUMERIC(18,2)   NOT NULL,
    total_installments  INTEGER         NOT NULL,
    paid_installments   INTEGER         NOT NULL DEFAULT 0,
    remaining_amount    NUMERIC(18,2)   NOT NULL,
    disbursement_date   DATE            NOT NULL,
    first_emi_date      DATE            NOT NULL,
    status              VARCHAR(32)     NOT NULL DEFAULT 'active',
    approved_by         UUID            REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    remarks             TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_loan_type CHECK (loan_type IN ('advance', 'personal_loan', 'vehicle_loan', 'home_loan', 'education_loan', 'emergency_loan')),
    CONSTRAINT chk_loan_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'defaulted'))
);

CREATE INDEX idx_loans_advances_emp ON loans_advances(employee_id, status);

-- Loan repayments
CREATE TABLE loan_repayments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id             UUID            NOT NULL REFERENCES loans_advances(id) ON DELETE CASCADE,
    payroll_run_id      UUID            REFERENCES payroll_runs(id),
    installment_number  INTEGER         NOT NULL,
    principal_amount    NUMERIC(18,2)   NOT NULL,
    interest_amount     NUMERIC(18,2)   DEFAULT 0,
    total_amount        NUMERIC(18,2)   NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    payment_date        DATE            NOT NULL,
    status              VARCHAR(32)     NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_repayment_status CHECK (status IN ('pending', 'paid', 'failed', 'waived'))
);

CREATE INDEX idx_loan_repayments_loan ON loan_repayments(loan_id, installment_number);
CREATE INDEX idx_loan_repayments_payroll ON loan_repayments(payroll_run_id);

-- =============================================================================
-- SECTION 6: TAX MANAGEMENT
-- =============================================================================

-- Employee tax profiles
CREATE TABLE employee_tax_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tax_identification_number VARCHAR(64),
    tax_registration_number VARCHAR(64),
    country_id          UUID          REFERENCES countries(id),
    tax_regime          tax_regime    NOT NULL DEFAULT 'default',
    fiscal_year         VARCHAR(9)    NOT NULL,
    declared_total_income NUMERIC(18,2) DEFAULT 0,
    estimated_tax_liability NUMERIC(18,2) DEFAULT 0,
    monthly_tds_amount  NUMERIC(18,2) DEFAULT 0,
    currency_code       VARCHAR(3)    NOT NULL,
    is_finalized        BOOLEAN       NOT NULL DEFAULT false,
    finalized_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE(employee_id, fiscal_year),
    CONSTRAINT chk_employee_tax_fiscal_year CHECK (fiscal_year ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_employee_tax_profiles_emp ON employee_tax_profiles(employee_id, fiscal_year);
CREATE INDEX idx_employee_tax_profiles_year ON employee_tax_profiles(fiscal_year, is_finalized);

-- Tax declarations
CREATE TABLE tax_declarations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    fiscal_year         VARCHAR(9)      NOT NULL,
    section_code        VARCHAR(32)     NOT NULL,
    declaration_type    VARCHAR(128)    NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    declared_amount     NUMERIC(18,2)   NOT NULL DEFAULT 0,
    approved_amount     NUMERIC(18,2),
    proof_submitted     BOOLEAN         NOT NULL DEFAULT false,
    proof_verified      BOOLEAN         NOT NULL DEFAULT false,
    proof_urls          TEXT[],
    approved_by         UUID            REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_tax_decl_fiscal_year CHECK (fiscal_year ~ '^\d{4}-\d{2}$'),
    CONSTRAINT chk_tax_declaration_tenant_consistency
        CHECK (tenant_id = (SELECT tenant_id FROM employees WHERE id = employee_id))
);

CREATE INDEX idx_tax_declarations_tenant ON tax_declarations(tenant_id, fiscal_year);
CREATE INDEX idx_tax_declarations_emp_year ON tax_declarations(tenant_id, employee_id, fiscal_year, section_code);

-- Previous employment income
CREATE TABLE previous_employment_income (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    fiscal_year         VARCHAR(9)      NOT NULL,
    employer_name       VARCHAR(255),
    currency_code       VARCHAR(3)      NOT NULL,
    gross_salary        NUMERIC(18,2)   NOT NULL DEFAULT 0,
    tax_deducted        NUMERIC(18,2)   DEFAULT 0,
    professional_tax    NUMERIC(18,2)   DEFAULT 0,
    other_income        NUMERIC(18,2)   DEFAULT 0,
    form_16_url         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_pei_fiscal_year CHECK (fiscal_year ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_previous_employment_income_emp ON previous_employment_income(employee_id, fiscal_year);

-- Monthly TDS deduction log
CREATE TABLE tds_deductions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            NOT NULL REFERENCES employees(id),
    payroll_run_id  UUID            NOT NULL REFERENCES payroll_runs(id),
    fiscal_year     VARCHAR(9)      NOT NULL,
    month_number    SMALLINT        NOT NULL,
    currency_code   VARCHAR(3)      NOT NULL,
    gross_salary    NUMERIC(18,2)   NOT NULL,
    tax_deducted    NUMERIC(18,2)   NOT NULL,
    surcharge       NUMERIC(18,2)   DEFAULT 0,
    education_cess  NUMERIC(18,2)   DEFAULT 0,
    total_tds       NUMERIC(18,2)   NOT NULL,
    cumulative_tds  NUMERIC(18,2)   DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(employee_id, payroll_run_id),
    CONSTRAINT chk_tds_month CHECK (month_number BETWEEN 1 AND 12),
    CONSTRAINT chk_tds_fiscal_year CHECK (fiscal_year ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_tds_deductions_emp ON tds_deductions(employee_id, fiscal_year);
CREATE INDEX idx_tds_deductions_run ON tds_deductions(payroll_run_id);

-- Statutory contributions per run
CREATE TABLE statutory_deductions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID            NOT NULL REFERENCES employees(id),
    payroll_run_id          UUID            NOT NULL REFERENCES payroll_runs(id),
    contribution_type_id    UUID            NOT NULL REFERENCES statutory_contribution_types(id),
    basis_amount            NUMERIC(18,2)   NOT NULL,
    currency_code           VARCHAR(3)      NOT NULL,
    employee_contribution   NUMERIC(18,2)   NOT NULL DEFAULT 0,
    employer_contribution   NUMERIC(18,2)   NOT NULL DEFAULT 0,
    employer_pension        NUMERIC(18,2)   DEFAULT 0,
    edli_contribution       NUMERIC(18,2)   DEFAULT 0,
    admin_charges           NUMERIC(18,2)   DEFAULT 0,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(employee_id, payroll_run_id, contribution_type_id)
);

CREATE INDEX idx_statutory_deductions_emp ON statutory_deductions(employee_id, payroll_run_id);
CREATE INDEX idx_statutory_deductions_run ON statutory_deductions(payroll_run_id);

-- =============================================================================
-- SECTION 7: AUDIT TRAILS
-- =============================================================================

-- Audit log for salary changes
CREATE TABLE salary_change_audit (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    compensation_id     UUID            NOT NULL REFERENCES employee_compensation(id),
    old_ctc_annual      NUMERIC(18,2),
    new_ctc_annual      NUMERIC(18,2),
    old_gross_monthly   NUMERIC(18,2),
    new_gross_monthly   NUMERIC(18,2),
    change_type         VARCHAR(64),
    change_reason       TEXT,
    changed_by          UUID            REFERENCES employees(id),
    changed_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_change_audit_emp ON salary_change_audit(employee_id, changed_at DESC);

-- Audit log for tax declarations
CREATE TABLE tax_declaration_audit (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_declaration_id  UUID            NOT NULL REFERENCES tax_declarations(id),
    employee_id         UUID            NOT NULL REFERENCES employees(id),
    fiscal_year         VARCHAR(9)      NOT NULL,
    old_declared_amount NUMERIC(18,2),
    new_declared_amount NUMERIC(18,2),
    old_approved_amount NUMERIC(18,2),
    new_approved_amount NUMERIC(18,2),
    action              VARCHAR(32)     NOT NULL,
    changed_by          UUID            REFERENCES employees(id),
    changed_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_tax_audit_action CHECK (action IN ('created', 'updated', 'approved', 'rejected', 'deleted'))
);

CREATE INDEX idx_tax_declaration_audit_emp ON tax_declaration_audit(employee_id, fiscal_year, changed_at DESC);

-- Audit log for compliance rule changes
CREATE TABLE compliance_rule_audit (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_rule_id  UUID            NOT NULL REFERENCES compliance_rules(id),
    country_id          UUID            NOT NULL REFERENCES countries(id),
    old_config          JSONB,
    new_config          JSONB,
    action              VARCHAR(32)     NOT NULL,
    changed_by          UUID            REFERENCES employees(id),
    changed_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_compliance_audit_action CHECK (action IN ('created', 'updated', 'activated', 'deactivated', 'deleted'))
);

CREATE INDEX idx_compliance_rule_audit_rule ON compliance_rule_audit(compliance_rule_id, changed_at DESC);
CREATE INDEX idx_compliance_rule_audit_country ON compliance_rule_audit(country_id, changed_at DESC);

-- Audit log for payroll modifications
CREATE TABLE payroll_modification_audit (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id      UUID            NOT NULL REFERENCES payroll_runs(id),
    employee_id         UUID            REFERENCES employees(id),
    modification_type   VARCHAR(64)     NOT NULL,
    old_value           JSONB,
    new_value           JSONB,
    reason              TEXT,
    modified_by         UUID            REFERENCES employees(id),
    modified_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_payroll_mod_type CHECK (modification_type IN ('status_change', 'amount_adjustment', 'component_added', 'component_removed', 'recalculation'))
);

CREATE INDEX idx_payroll_mod_audit_run ON payroll_modification_audit(payroll_run_id, modified_at DESC);
CREATE INDEX idx_payroll_mod_audit_emp ON payroll_modification_audit(employee_id, modified_at DESC);

-- =============================================================================
-- END OF PAYROLL SCHEMA
-- =============================================================================

