CREATE TABLE designations (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    level         INTEGER,
    department_id BIGINT       REFERENCES departments(id) ON DELETE SET NULL,
    status        VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX designations_tenant     ON designations(tenant_id);
CREATE INDEX designations_department ON designations(department_id);

CREATE TRIGGER trg_designations_updated_at
BEFORE UPDATE ON designations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
