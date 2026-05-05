-- Minimal geography seed so /locations forms have at least one option to
-- pick. Idempotent via ON CONFLICT against the iso_code unique key.
-- Expand via a richer dataset (e.g. CSV import) when M5 hardening lands.

INSERT INTO countries (name, iso_code) VALUES
    ('India',          'IN'),
    ('United States',  'US'),
    ('United Kingdom', 'GB'),
    ('Singapore',      'SG'),
    ('Germany',        'DE')
ON CONFLICT (iso_code) DO NOTHING;

-- States are seeded by country code so the inserts stay readable.
INSERT INTO states (country_id, name)
SELECT c.id, s.name
FROM (VALUES
    ('IN', 'Karnataka'),
    ('IN', 'Maharashtra'),
    ('IN', 'Delhi'),
    ('US', 'California'),
    ('US', 'New York'),
    ('GB', 'England'),
    ('DE', 'Bavaria')
) AS s(iso, name)
JOIN countries c ON c.iso_code = s.iso
WHERE NOT EXISTS (
    SELECT 1 FROM states s2 WHERE s2.country_id = c.id AND s2.name = s.name
);

INSERT INTO cities (state_id, name)
SELECT st.id, c.name
FROM (VALUES
    ('Karnataka',    'Bengaluru'),
    ('Karnataka',    'Mysuru'),
    ('Maharashtra',  'Mumbai'),
    ('Maharashtra',  'Pune'),
    ('Delhi',        'New Delhi'),
    ('California',   'San Francisco'),
    ('California',   'Los Angeles'),
    ('New York',     'New York City'),
    ('England',      'London'),
    ('Bavaria',      'Munich')
) AS c(state_name, name)
JOIN states st ON st.name = c.state_name
WHERE NOT EXISTS (
    SELECT 1 FROM cities c2 WHERE c2.state_id = st.id AND c2.name = c.name
);
