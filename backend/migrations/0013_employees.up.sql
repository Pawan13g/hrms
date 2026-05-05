CREATE TABLE employees (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_code   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(64),
    date_of_birth   DATE,
    gender          VARCHAR(32),
    joining_date    DATE         NOT NULL,
    employment_type VARCHAR(64),
    department_id   BIGINT       REFERENCES departments(id)  ON DELETE SET NULL,
    designation_id  BIGINT       REFERENCES designations(id) ON DELETE SET NULL,
    location_id     BIGINT       REFERENCES locations(id)    ON DELETE SET NULL,
    manager_id      BIGINT       REFERENCES employees(id)    ON DELETE SET NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX employees_tenant_status
    ON employees(tenant_id, status);
CREATE UNIQUE INDEX employees_tenant_employee_code
    ON employees(tenant_id, employee_code);
CREATE UNIQUE INDEX employees_tenant_email
    ON employees(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX employees_manager     ON employees(manager_id);
CREATE INDEX employees_department  ON employees(department_id);
CREATE INDEX employees_designation ON employees(designation_id);

CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
