CREATE TABLE field_permissions (
    id        BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT  NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
    role_id   BIGINT  NOT NULL REFERENCES roles(id)         ON DELETE CASCADE,
    field_id  BIGINT  NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    can_view  BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX field_permissions_role_field
    ON field_permissions(role_id, field_id);
