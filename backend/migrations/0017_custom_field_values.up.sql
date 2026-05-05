CREATE TABLE custom_field_values (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    BIGINT       NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
    entity_type  VARCHAR(64)  NOT NULL,
    entity_id    BIGINT       NOT NULL,
    field_id     BIGINT       REFERENCES custom_fields(id) ON DELETE CASCADE,
    value_text   TEXT,
    value_number NUMERIC,
    value_date   DATE,
    value_json   JSONB,
    status       VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX custom_field_values_lookup
    ON custom_field_values(tenant_id, entity_type, entity_id);

CREATE TRIGGER trg_custom_field_values_updated_at
BEFORE UPDATE ON custom_field_values
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
