-- Note: schemas/employee.sql had a reversed fk_cities_id constraint
-- (CONSTRAINT fk_cities_id FOREIGN KEY (id) REFERENCES tenants(city_id)) which
-- is invalid — tenants.city_id is not a target key, and the direction is the
-- inverse of the actual cities -> tenants relationship. Dropped per
-- 01-backend-plan §2.
CREATE TABLE cities (
    id       BIGSERIAL PRIMARY KEY,
    state_id BIGINT       REFERENCES states(id) ON DELETE CASCADE,
    name     VARCHAR(255) NOT NULL
);

CREATE INDEX cities_state ON cities(state_id);

ALTER TABLE tenants
    ADD CONSTRAINT fk_tenants_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;
