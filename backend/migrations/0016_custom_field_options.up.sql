CREATE TABLE custom_field_options (
    id           BIGSERIAL PRIMARY KEY,
    field_id     BIGINT       NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    option_value VARCHAR(255) NOT NULL,
    option_label VARCHAR(255),
    status       VARCHAR(32)  NOT NULL DEFAULT 'active'
);

CREATE INDEX custom_field_options_field ON custom_field_options(field_id);
