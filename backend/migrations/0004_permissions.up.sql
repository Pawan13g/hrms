CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    key         VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);
