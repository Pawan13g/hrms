-- Reverse seed by ISO code so we don't accidentally drop user-added rows.
DELETE FROM cities    WHERE state_id IN (SELECT id FROM states WHERE country_id IN (SELECT id FROM countries WHERE iso_code IN ('IN','US','GB','SG','DE')));
DELETE FROM states    WHERE country_id IN (SELECT id FROM countries WHERE iso_code IN ('IN','US','GB','SG','DE'));
DELETE FROM countries WHERE iso_code IN ('IN','US','GB','SG','DE');
