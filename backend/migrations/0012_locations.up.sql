CREATE TABLE locations (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    address_line1 TEXT,
    address_line2 TEXT,
    country_id    BIGINT       REFERENCES countries(id) ON DELETE SET NULL,
    state_id      BIGINT       REFERENCES states(id)    ON DELETE SET NULL,
    city_id       BIGINT       REFERENCES cities(id)    ON DELETE SET NULL,
    pincode       VARCHAR(32),
    timezone      VARCHAR(64),
    status        VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX locations_tenant ON locations(tenant_id);

CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
