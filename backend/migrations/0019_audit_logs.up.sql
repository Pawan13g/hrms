CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(64),
    entity_id   BIGINT,
    action      VARCHAR(32),
    changed_by  BIGINT,
    old_data    JSONB,
    new_data    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_logs_lookup
    ON audit_logs(tenant_id, entity_type, entity_id, created_at DESC);
