CREATE TABLE departments (
    id         BIGSERIAL PRIMARY KEY,
    tenant_id  BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    code       VARCHAR(255),
    parent_id  BIGINT       REFERENCES departments(id) ON DELETE SET NULL,
    status     VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX departments_tenant       ON departments(tenant_id);
CREATE INDEX departments_parent       ON departments(parent_id);
CREATE UNIQUE INDEX departments_tenant_code_uniq
    ON departments(tenant_id, code) WHERE code IS NOT NULL;

CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
