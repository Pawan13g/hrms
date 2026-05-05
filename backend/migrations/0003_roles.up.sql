CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    status      VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX roles_tenant_name ON roles(tenant_id, name);
