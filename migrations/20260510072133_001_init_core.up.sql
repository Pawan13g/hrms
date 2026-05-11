-- =============================================================================
-- CORE SCHEMA - HRMS Application v1.0
-- =============================================================================
-- Contains: Geography, Tenants, Users, RBAC, Departments, Locations, Employees
-- =============================================================================

-- =============================================================================
-- SECTION 1: LOOKUP/REFERENCE TABLES
-- =============================================================================

CREATE TABLE genders (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO genders (code, name) VALUES
    ('male', 'Male'),
    ('female', 'Female'),
    ('other', 'Other'),
    ('prefer_not_to_say', 'Prefer Not To Say');

CREATE TABLE marital_statuses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO marital_statuses (code, name) VALUES
    ('single', 'Single'),
    ('married', 'Married'),
    ('divorced', 'Divorced'),
    ('widowed', 'Widowed'),
    ('separated', 'Separated');

CREATE TABLE employment_types (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO employment_types (code, name) VALUES
    ('full_time', 'Full Time'),
    ('part_time', 'Part Time'),
    ('contract', 'Contract'),
    ('temporary', 'Temporary'),
    ('intern', 'Intern'),
    ('consultant', 'Consultant');

CREATE TABLE employment_statuses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO employment_statuses (code, name) VALUES
    ('active', 'Active'),
    ('on_leave', 'On Leave'),
    ('suspended', 'Suspended'),
    ('terminated', 'Terminated'),
    ('resigned', 'Resigned'),
    ('retired', 'Retired');

CREATE TABLE document_types (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO document_types (code, name) VALUES
    ('passport', 'Passport'),
    ('national_id', 'National ID'),
    ('drivers_license', 'Driver''s License'),
    ('visa', 'Visa'),
    ('work_permit', 'Work Permit'),
    ('birth_certificate', 'Birth Certificate'),
    ('education_certificate', 'Education Certificate'),
    ('experience_letter', 'Experience Letter'),
    ('address_proof', 'Address Proof'),
    ('bank_statement', 'Bank Statement'),
    ('tax_document', 'Tax Document'),
    ('medical_certificate', 'Medical Certificate'),
    ('background_check', 'Background Check'),
    ('offer_letter', 'Offer Letter'),
    ('contract', 'Contract'),
    ('other', 'Other');

CREATE TABLE bank_account_types (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO bank_account_types (code, name) VALUES
    ('savings', 'Savings'),
    ('checking', 'Checking'),
    ('current', 'Current'),
    ('salary', 'Salary');

-- =============================================================================
-- SECTION 2: CORE FOUNDATION - GEOGRAPHY
-- =============================================================================

-- Countries master table
CREATE TABLE countries (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(3)      NOT NULL UNIQUE,
    name                VARCHAR(255)    NOT NULL,
    iso_code            VARCHAR(3)      UNIQUE,
    currency_code       VARCHAR(3)      NOT NULL,
    currency_symbol     VARCHAR(10),
    phone_code          VARCHAR(10),
    timezone            VARCHAR(64),
    date_format         VARCHAR(32)     DEFAULT 'YYYY-MM-DD',
    fiscal_year_start   VARCHAR(5)      DEFAULT '01-01',
    working_hours_per_week NUMERIC(5,2) DEFAULT 40.00,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_countries_code ON countries(code) WHERE status = 'active';
CREATE INDEX idx_countries_currency ON countries(currency_code) WHERE status = 'active';

-- States/Provinces
CREATE TABLE states (
    id                  SERIAL PRIMARY KEY,
    country_id          BIGINT            NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(10),
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_states_country ON states(country_id);

-- Cities
CREATE TABLE cities (
    id                  SERIAL PRIMARY KEY,
    state_id            BIGINT            NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(10),
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_cities_state ON cities(state_id);

-- =============================================================================
-- SECTION 3: MULTI-TENANT STRUCTURE
-- =============================================================================

-- Tenants (Organizations)
CREATE TABLE tenants (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(255)    NOT NULL UNIQUE,
    legal_name          VARCHAR(255),
    registration_number VARCHAR(128),
    tax_id              VARCHAR(128),
    country_id          BIGINT            REFERENCES countries(id),
    city_id             BIGINT            REFERENCES cities(id),
    primary_currency    VARCHAR(3)      NOT NULL,
    timezone            VARCHAR(64)     DEFAULT 'UTC',
    date_format         VARCHAR(32)     DEFAULT 'YYYY-MM-DD',
    fiscal_year_start   VARCHAR(5)      DEFAULT '01-01',
    logo_url            TEXT,
    website             VARCHAR(255),
    email               VARCHAR(255),
    phone               VARCHAR(32),
    address             TEXT,
    settings            JSONB           NOT NULL DEFAULT '{}',
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_code ON tenants(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_country ON tenants(country_id) WHERE deleted_at IS NULL;

-- Tenant locations
CREATE TABLE locations (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    country_id          BIGINT            REFERENCES countries(id),
    state_id            BIGINT            REFERENCES states(id),
    city_id             BIGINT            REFERENCES cities(id),
    address             TEXT,
    postal_code         VARCHAR(32),
    phone               VARCHAR(32),
    email               VARCHAR(255),
    timezone            VARCHAR(64),
    is_headquarters     BOOLEAN         DEFAULT FALSE,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_country ON locations(country_id);

-- =============================================================================
-- SECTION 4: APPLICATION MODULES & PACKAGES
-- =============================================================================

-- Application modules
CREATE TABLE app_modules (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL UNIQUE,
    code                VARCHAR(64)     NOT NULL UNIQUE,
    description         TEXT,
    icon                VARCHAR(128),
    display_order       INTEGER         DEFAULT 0,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_modules_code ON app_modules(code) WHERE deleted_at IS NULL;

-- Subscription packages
CREATE TABLE packages (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64)     NOT NULL UNIQUE,
    description         TEXT,
    max_employees       INTEGER,
    price_monthly       NUMERIC(12,2),
    price_annual        NUMERIC(12,2),
    currency_code       VARCHAR(3)      NOT NULL,
    features            JSONB           DEFAULT '{}',
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_code ON packages(code) WHERE deleted_at IS NULL;

-- Package modules mapping
CREATE TABLE package_modules (
    id                  SERIAL PRIMARY KEY,
    package_id          BIGINT            NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    module_id           BIGINT            NOT NULL REFERENCES app_modules(id) ON DELETE CASCADE,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(package_id, module_id)
);

CREATE INDEX idx_package_modules_package ON package_modules(package_id) WHERE deleted_at IS NULL;

-- Tenant subscriptions
CREATE TABLE tenant_subscriptions (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    package_id          BIGINT            NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    start_date          TIMESTAMPTZ     NOT NULL,
    end_date            TIMESTAMPTZ     NOT NULL,
    is_trial            BOOLEAN         DEFAULT FALSE,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id, status);
CREATE INDEX idx_tenant_subscriptions_dates ON tenant_subscriptions(start_date, end_date);

-- =============================================================================
-- SECTION 5: USER MANAGEMENT & RBAC
-- =============================================================================

-- Users
CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email               VARCHAR(255)    NOT NULL,
    password_hash       TEXT            NOT NULL,
    first_name          VARCHAR(128),
    last_name           VARCHAR(128),
    phone               VARCHAR(32),
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id, status);
CREATE INDEX idx_users_email ON users(email) WHERE status = 'active';

-- Roles
CREATE TABLE roles (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    description         TEXT,
    is_system           BOOLEAN         DEFAULT FALSE,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id) WHERE deleted_at IS NULL;

-- Permissions
CREATE TABLE permissions (
    id                  SERIAL PRIMARY KEY,
    key                 VARCHAR(255)    NOT NULL UNIQUE,
    module_code         VARCHAR(100),
    description         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_permissions_key ON permissions(key);
CREATE INDEX idx_permissions_module ON permissions(module_code);

-- Role permissions
CREATE TABLE role_permissions (
    id                  SERIAL PRIMARY KEY,
    role_id             BIGINT            NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id       BIGINT            NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- User roles
CREATE TABLE user_roles (
    id                  SERIAL PRIMARY KEY,
    user_id             BIGINT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id             BIGINT            NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- =============================================================================
-- SECTION 6: ORGANIZATIONAL STRUCTURE
-- =============================================================================

-- Departments
CREATE TABLE departments (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    parent_department_id BIGINT           REFERENCES departments(id) ON DELETE SET NULL,
    department_head_id    BIGINT,
    description         TEXT,
    cost_center_code    VARCHAR(64),
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_parent ON departments(parent_department_id);

-- Designations
CREATE TABLE designations (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    level               INTEGER,
    description         TEXT,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_designations_tenant ON designations(tenant_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- SECTION 7: EMPLOYEES
-- =============================================================================

-- Employees
CREATE TABLE employees (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id             BIGINT                REFERENCES users(id) ON DELETE SET NULL,
    employee_code       VARCHAR(64)         NOT NULL,
    
    -- Personal Information
    first_name          VARCHAR(128)        NOT NULL,
    middle_name         VARCHAR(128),
    last_name           VARCHAR(128)        NOT NULL,
    date_of_birth       DATE,
    gender_id           BIGINT  REFERENCES genders(id),
    marital_status_id   BIGINT  REFERENCES marital_statuses(id),
    nationality         VARCHAR(64),
    
    -- Contact Information
    email               VARCHAR(255)        NOT NULL,
    personal_email      VARCHAR(255),
    phone               VARCHAR(32),
    alternate_phone     VARCHAR(32),
    address             TEXT,
    city_id             BIGINT                REFERENCES cities(id),
    postal_code         VARCHAR(32),
    
    -- Employment Details
    department_id       BIGINT                REFERENCES departments(id) ON DELETE SET NULL,
    designation_id      BIGINT                REFERENCES designations(id) ON DELETE SET NULL,
    location_id         BIGINT                REFERENCES locations(id) ON DELETE SET NULL,
    employment_type_id  BIGINT  NOT NULL REFERENCES employment_types(id),
    employment_status_id BIGINT NOT NULL REFERENCES employment_statuses(id),
    hire_date           DATE                NOT NULL,
    joining_date        DATE                NOT NULL,
    termination_date    DATE,
    notice_period_days  INTEGER             DEFAULT 30,
    
    -- Reporting Structure
    reporting_manager_id BIGINT               REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Additional Information
    profile_picture_url TEXT,
    emergency_contacts  JSONB               DEFAULT '[]',
    
    -- Status
    status              VARCHAR(50)         DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
    
    UNIQUE(tenant_id, employee_code),
    UNIQUE(tenant_id, email),
    CONSTRAINT chk_employee_termination_date CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id, status);
CREATE INDEX idx_employees_status ON employees(employment_status_id, status);
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_email ON employees(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_department ON employees(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_location ON employees(location_id) WHERE deleted_at IS NULL;

-- Add foreign key for department head
ALTER TABLE departments ADD CONSTRAINT fk_departments_head 
    FOREIGN KEY (department_head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Employee bank accounts
CREATE TABLE employee_bank_accounts (
    id                  SERIAL PRIMARY KEY,
    employee_id         BIGINT            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(255)    NOT NULL,
    bank_name           VARCHAR(255)    NOT NULL,
    account_number      VARCHAR(128)    NOT NULL,
    routing_number      VARCHAR(64),
    swift_code          VARCHAR(32),
    iban                VARCHAR(64),
    ifsc_code           VARCHAR(32),
    branch_name         VARCHAR(255),
    account_type_id     BIGINT  REFERENCES bank_account_types(id),
    currency_code       VARCHAR(3)      NOT NULL,
    is_primary          BOOLEAN         NOT NULL DEFAULT false,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_bank_accounts_emp ON employee_bank_accounts(employee_id, status);
CREATE UNIQUE INDEX idx_employee_bank_primary ON employee_bank_accounts(employee_id)
    WHERE is_primary = true AND status = 'active';

-- Employee documents (normalized from employees.documents JSONB)
CREATE TABLE employee_documents (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         BIGINT            NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type_id    BIGINT  NOT NULL REFERENCES document_types(id),
    document_name       VARCHAR(255)    NOT NULL,
    document_number     VARCHAR(128),
    file_url            TEXT            NOT NULL,
    file_size_bytes     BIGINT,
    mime_type           VARCHAR(128),
    issue_date          DATE,
    expiry_date         DATE,
    is_verified         BOOLEAN         NOT NULL DEFAULT false,
    verified_by         BIGINT            REFERENCES employees(id),
    verified_at         TIMESTAMPTZ,
    notes               TEXT,
    status              VARCHAR(50)     DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_document_expiry CHECK (expiry_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX idx_employee_documents_emp ON employee_documents(employee_id, status);
CREATE INDEX idx_employee_documents_tenant ON employee_documents(tenant_id, status);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type_id, status);
CREATE INDEX idx_employee_documents_expiry ON employee_documents(expiry_date)
    WHERE expiry_date IS NOT NULL AND status = 'active';

-- =============================================================================
-- SECTION 8: CUSTOM FORMS & FIELDS
-- =============================================================================

-- Custom forms
CREATE TABLE custom_forms (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(64)     NOT NULL,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    display_order       INTEGER         DEFAULT 0,
    is_system           BOOLEAN         DEFAULT FALSE,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_forms_tenant ON custom_forms(tenant_id, code) WHERE deleted_at IS NULL;

-- Custom form sections
CREATE TABLE custom_form_sections (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    form_id             BIGINT         NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    section_key         VARCHAR(255)   NOT NULL,
    section_label       VARCHAR(255)   NOT NULL,
    description         TEXT,
    display_order       INTEGER        DEFAULT 0,
    is_collapsible      BOOLEAN        DEFAULT FALSE,
    is_collapsed        BOOLEAN        DEFAULT FALSE,
    status              VARCHAR(50)    DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),

    UNIQUE(form_id, section_key)
);

CREATE INDEX idx_custom_form_sections_form ON custom_form_sections(form_id) WHERE deleted_at IS NULL;

-- Custom fields
CREATE TABLE custom_fields (
    id                  SERIAL PRIMARY KEY,
    tenant_id           BIGINT            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    form_id             BIGINT            NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    section_id          BIGINT            REFERENCES custom_form_sections(id) ON DELETE SET NULL,
    field_key           VARCHAR(255)    NOT NULL,
    field_label         VARCHAR(255),
    data_type           VARCHAR(50)     NOT NULL,
    is_required         BOOLEAN         DEFAULT FALSE,
    display_order       INTEGER         DEFAULT 0,
    validation_json     JSONB,
    status              VARCHAR(50)     DEFAULT 'active',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(form_id, field_key)
);

CREATE INDEX idx_custom_fields_form ON custom_fields(form_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_fields_section ON custom_fields(section_id) WHERE deleted_at IS NULL;

-- Custom field values
CREATE TABLE custom_field_values (
    id                  SERIAL PRIMARY KEY,
    field_id            BIGINT            NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    entity_type         VARCHAR(64)     NOT NULL,
    entity_id           BIGINT            NOT NULL,
    field_value         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(field_id, entity_type, entity_id)
);

CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(field_id);

