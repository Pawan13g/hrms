CREATE TABLE countries (
    id       BIGSERIAL PRIMARY KEY,
    name     VARCHAR(255) NOT NULL,
    iso_code VARCHAR(8)   UNIQUE,
    status   VARCHAR(32)  NOT NULL DEFAULT 'active'
);
