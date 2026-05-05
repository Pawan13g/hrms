CREATE TABLE custom_fields (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT       NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
    form_id         BIGINT       NOT NULL REFERENCES custom_forms(id)  ON DELETE CASCADE,
    field_key       VARCHAR(255) NOT NULL,
    field_label     VARCHAR(255),
    data_type       VARCHAR(32)  NOT NULL,
    is_required     BOOLEAN      NOT NULL DEFAULT FALSE,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',
    validation_json JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX custom_fields_form_key ON custom_fields(form_id, field_key);
CREATE INDEX custom_fields_tenant ON custom_fields(tenant_id);

CREATE TRIGGER trg_custom_fields_updated_at
BEFORE UPDATE ON custom_fields
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
