ALTER TABLE employees ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;

-- Backfill: match employees to users by email within the same tenant.
UPDATE employees e
SET user_id = u.id
FROM users u
WHERE e.email = u.email
  AND e.tenant_id = u.tenant_id
  AND e.user_id IS NULL;
