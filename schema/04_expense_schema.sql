-- =============================================================================
-- EXPENSE MANAGEMENT SCHEMA - HRMS Application v1.0
-- =============================================================================
-- Contains: Expense Claims, Categories, Policies, Approvals, Advances
-- Dependencies: 01_org_schema.sql, 03_payroll_schema.sql
-- =============================================================================

-- =============================================================================
-- SECTION 1: ENUM TYPES (Expense Related)
-- =============================================================================

CREATE TYPE expense_claim_status AS ENUM (
    'draft',
    'submitted',
    'pending_approval',
    'approved',
    'rejected',
    'paid',
    'cancelled'
);

CREATE TYPE expense_category_type AS ENUM (
    'travel',
    'accommodation',
    'meals',
    'transportation',
    'communication',
    'office_supplies',
    'client_entertainment',
    'training',
    'medical',
    'other'
);

CREATE TYPE expense_payment_method AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'bank_transfer',
    'digital_wallet',
    'other'
);

-- =============================================================================
-- SECTION 2: EXPENSE CATEGORIES & POLICIES
-- =============================================================================

-- Expense categories
CREATE TABLE expense_categories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    category_type       expense_category_type NOT NULL,
    description         TEXT,
    requires_receipt    BOOLEAN         NOT NULL DEFAULT true,
    receipt_threshold   NUMERIC(18,2),
    max_amount_per_claim NUMERIC(18,2),
    max_amount_per_month NUMERIC(18,2),
    requires_approval   BOOLEAN         NOT NULL DEFAULT true,
    approval_hierarchy  JSONB           DEFAULT '[]',
    is_taxable          BOOLEAN         NOT NULL DEFAULT false,
    gl_account_code     VARCHAR(64),
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_expense_categories_tenant ON expense_categories(tenant_id, status);
CREATE INDEX idx_expense_categories_type ON expense_categories(category_type, status);

-- Expense policies
CREATE TABLE expense_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    description         TEXT,
    applicable_to       TEXT[],
    daily_limit         NUMERIC(18,2),
    monthly_limit       NUMERIC(18,2),
    annual_limit        NUMERIC(18,2),
    currency_code       VARCHAR(3)      NOT NULL,
    advance_allowed     BOOLEAN         NOT NULL DEFAULT false,
    max_advance_amount  NUMERIC(18,2),
    policy_rules        JSONB           DEFAULT '{}',
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    is_default          BOOLEAN         NOT NULL DEFAULT false,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_expense_policies_tenant ON expense_policies(tenant_id, status);
CREATE INDEX idx_expense_policies_dates ON expense_policies(effective_from, effective_to);

-- Employee expense policy assignments
CREATE TABLE employee_expense_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    policy_id           UUID            NOT NULL REFERENCES expense_policies(id) ON DELETE CASCADE,
    effective_from      DATE            NOT NULL,
    effective_to        DATE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_expense_policies_emp ON employee_expense_policies(employee_id, effective_from);

-- =============================================================================
-- SECTION 3: EXPENSE CLAIMS
-- =============================================================================

-- Expense claims
CREATE TABLE expense_claims (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    claim_number        VARCHAR(64)     NOT NULL,
    policy_id           UUID            REFERENCES expense_policies(id),
    claim_date          DATE            NOT NULL,
    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    purpose             TEXT            NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    total_amount        NUMERIC(18,2)   NOT NULL DEFAULT 0,
    approved_amount     NUMERIC(18,2),
    tax_amount          NUMERIC(18,2)   DEFAULT 0,
    advance_taken       NUMERIC(18,2)   DEFAULT 0,
    net_payable         NUMERIC(18,2)   GENERATED ALWAYS AS (
        COALESCE(approved_amount, total_amount) - COALESCE(advance_taken, 0)
    ) STORED,
    status              expense_claim_status NOT NULL DEFAULT 'draft',
    submitted_at        TIMESTAMPTZ,
    approved_by         UUID            REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    payment_date        DATE,
    payroll_run_id      UUID            REFERENCES payroll_runs(id) ON DELETE SET NULL,
    payment_reference   VARCHAR(255),
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, claim_number),
    CONSTRAINT chk_expense_claim_dates CHECK (period_end >= period_start),
    CONSTRAINT fk_expense_claims_payroll_run 
        FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE SET NULL
);

CREATE INDEX idx_expense_claims_tenant ON expense_claims(tenant_id, claim_date DESC);
CREATE INDEX idx_expense_claims_emp ON expense_claims(employee_id, status, claim_date DESC);
CREATE INDEX idx_expense_claims_status ON expense_claims(status, claim_date);
CREATE INDEX idx_expense_claims_payroll ON expense_claims(payroll_run_id)
    WHERE payroll_run_id IS NOT NULL;

-- Expense line items
CREATE TABLE expense_line_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id            UUID            NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
    category_id         UUID            NOT NULL REFERENCES expense_categories(id),
    expense_date        DATE            NOT NULL,
    description         TEXT            NOT NULL,
    merchant_name       VARCHAR(255),
    location            VARCHAR(255),
    currency_code       VARCHAR(3)      NOT NULL,
    amount              NUMERIC(18,2)   NOT NULL,
    exchange_rate       NUMERIC(12,6)   DEFAULT 1.0,
    base_amount         NUMERIC(18,2)   GENERATED ALWAYS AS (amount * exchange_rate) STORED,
    tax_amount          NUMERIC(18,2)   DEFAULT 0,
    payment_method      expense_payment_method,
    is_billable         BOOLEAN         NOT NULL DEFAULT false,
    client_name         VARCHAR(255),
    project_code        VARCHAR(64),
    receipt_url         TEXT,
    receipt_number      VARCHAR(128),
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_expense_amount CHECK (amount > 0)
);

CREATE INDEX idx_expense_line_items_claim ON expense_line_items(claim_id);
CREATE INDEX idx_expense_line_items_category ON expense_line_items(category_id, expense_date);
CREATE INDEX idx_expense_line_items_date ON expense_line_items(expense_date DESC);
CREATE INDEX idx_expense_line_items_billable ON expense_line_items(is_billable, client_name)
    WHERE is_billable = true;

-- =============================================================================
-- SECTION 4: APPROVAL WORKFLOW
-- =============================================================================

-- Expense approvals
CREATE TABLE expense_approvals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id            UUID            NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
    approver_id         UUID            NOT NULL REFERENCES employees(id),
    approval_level      INTEGER         NOT NULL,
    status              VARCHAR(32)     NOT NULL DEFAULT 'pending',
    approved_amount     NUMERIC(18,2),
    comments            TEXT,
    actioned_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'delegated'))
);

CREATE INDEX idx_expense_approvals_claim ON expense_approvals(claim_id, approval_level);
CREATE INDEX idx_expense_approvals_approver ON expense_approvals(approver_id, status);

-- =============================================================================
-- SECTION 5: EXPENSE ADVANCES
-- =============================================================================

-- Expense advances
CREATE TABLE expense_advances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         UUID            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    advance_number      VARCHAR(64)     NOT NULL,
    purpose             TEXT            NOT NULL,
    currency_code       VARCHAR(3)      NOT NULL,
    requested_amount    NUMERIC(18,2)   NOT NULL,
    approved_amount     NUMERIC(18,2),
    disbursed_amount    NUMERIC(18,2),
    settled_amount      NUMERIC(18,2)   DEFAULT 0,
    balance_amount      NUMERIC(18,2)   GENERATED ALWAYS AS (
        COALESCE(disbursed_amount, 0) - COALESCE(settled_amount, 0)
    ) STORED,
    request_date        DATE            NOT NULL,
    approved_by         UUID            REFERENCES employees(id),
    approved_at         TIMESTAMPTZ,
    disbursement_date   DATE,
    settlement_deadline DATE,
    status              VARCHAR(32)     NOT NULL DEFAULT 'pending',
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, advance_number),
    CONSTRAINT chk_advance_status CHECK (status IN (
        'pending', 'approved', 'rejected', 'disbursed', 'partially_settled', 'settled', 'cancelled'
    ))
);

CREATE INDEX idx_expense_advances_tenant ON expense_advances(tenant_id, request_date DESC);
CREATE INDEX idx_expense_advances_emp ON expense_advances(employee_id, status);
CREATE INDEX idx_expense_advances_status ON expense_advances(status, settlement_deadline);

-- =============================================================================
-- END OF EXPENSE MANAGEMENT SCHEMA
-- =============================================================================

-- Made with Bob
