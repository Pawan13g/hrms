-- name: GetUserForLogin :one
SELECT id, password_hash
FROM users
WHERE tenant_id = $1
  AND email = $2
  AND status = 'active'
  AND is_active = TRUE;

-- name: GetTenantByCode :one
SELECT id
FROM tenants
WHERE code = $1
  AND status = 'active';

-- name: ListUserRoleIDs :many
SELECT role_id
FROM user_roles
WHERE user_id = $1;

-- name: ListPermKeysForRoles :many
SELECT DISTINCT p.key
FROM permissions p
JOIN role_permissions rp ON rp.permission_id = p.id
JOIN roles r ON r.id = rp.role_id
WHERE r.tenant_id = $1
  AND r.id = ANY($2::bigint[]);
