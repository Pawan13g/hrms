CREATE TABLE states (
    id         BIGSERIAL PRIMARY KEY,
    country_id BIGINT       REFERENCES countries(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL
);

CREATE INDEX states_country ON states(country_id);
