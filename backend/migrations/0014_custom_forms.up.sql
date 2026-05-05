CREATE TABLE custom_forms (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    module        VARCHAR(64)  NOT NULL,
    display_order INTEGER      NOT NULL DEFAULT 0,
    is_system     BOOLEAN      NOT NULL DEFAULT FALSE,
    status        VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX custom_forms_tenant_module ON custom_forms(tenant_id, module);

CREATE TRIGGER trg_custom_forms_updated_at
BEFORE UPDATE ON custom_forms
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
