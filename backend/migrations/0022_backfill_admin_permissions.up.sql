-- Backfill: grant every permission to every system Admin role that is missing
-- any. This covers the newly-added `rbac.manage` key (and any future keys
-- seeded before this migration runs).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE r.is_system = TRUE
  AND r.status = 'active'
  AND rp.role_id IS NULL;
