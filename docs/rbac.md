# RBAC & Multi-Tenancy

## Model
- **Tenant** — the top isolation boundary. Every business row carries `tenant_id`.
- **User** — an account belonging to one tenant.
- **Role** — a named bundle of permissions, scoped to a tenant.
- **Permission** — a global, immutable string key (`employee.read`, ...).
- **user_roles** — a user can hold multiple roles.
- **role_permissions** — a role grants many permissions.

## Permission keys (registry)
Defined in Go, seeded into the `permissions` table on startup:
```
employee.read     # list & view employees
employee.write    # create / update employees
employee.delete   # deactivate / hard delete (admin only)

org.read          # departments, designations, locations
org.write

role.read
role.write

customfield.read
customfield.write

audit.read
```
Adding a new permission = add a constant in `internal/rbac/keys.go` and write a migration that inserts it; the seeder upserts on boot.

## System roles (seeded per tenant)
| Role | Permissions |
|---|---|
| Admin | all of the above |
| HR | employee.* + org.* + customfield.* + audit.read |
| Manager | employee.read (scope: direct reports) + customfield.read |
| Employee | employee.read (scope: self) + customfield.read |

`is_system = true` for these; UI prevents editing/deleting them.

## Enforcement layers
1. **JWT** — issued at login, contains `tid` and a denormalised `perms: string[]` for the duration of the access token (15m).
2. **GraphQL directive** `@hasPermission(key: "...")` — declarative, on every field/mutation. Reads `perms` from `context.Context`.
3. **Service layer** — re-checks for write operations and any scope-sensitive logic (e.g., a Manager can only update employees who report to them).
4. **Postgres RLS** — defense in depth; rejects cross-tenant queries even if a service forgets to filter.

## Field-level permissions (custom fields)
- `field_permissions(role_id, field_id, can_view, can_edit)` overlays the resource-level perms.
- On `Employee` resolvers, after loading custom field values, filter by the caller's roles.
- Sensitive built-in fields (e.g., `dateOfBirth`, `phone`) can be controlled by adding "virtual" entries in `field_permissions` keyed off a stable system field key — design refinement deferred to M4.

## Tenant resolution at login
Login payload: `{ tenantCode, email, password }`.
- Lookup `tenants` by `code`. 404 if not found or inactive.
- Lookup `users` by `(tenant_id, email)`. 401 if not found or inactive.
- Verify bcrypt hash. 401 on mismatch.
- Issue tokens with `tid = tenant.id`.

## Tenant guard middleware
On every authenticated request:
1. Parse JWT → get `tid`.
2. Read optional `X-Tenant-Code` header (set by frontend). If present, verify it resolves to the same tenant; otherwise reject 403.
3. Open a pg transaction with `SET LOCAL app.tenant_id = $tid` so RLS kicks in.
4. Pass `tenantID` to all repos.

## Permission check helper (Go sketch)
```go
func RequirePerm(ctx context.Context, key string) error {
  c, ok := auth.FromContext(ctx)
  if !ok { return ErrUnauthenticated }
  if !c.Perms.Has(key) { return ErrForbidden }
  return nil
}
```

## Caching & invalidation
- `user:{id}:perms` cached in Redis (5m TTL) so we don't recompute on every request.
- Invalidate on: `assignRole`, `updateRolePermissions`, `createRole`, role deactivate.
- The next login re-issues a fresh JWT with the new perms; in-flight short-lived tokens stay valid until expiry — acceptable.

## Audit
Every permission-protected mutation calls `audit.Recorder.Record` with `changed_by = userID`, recording before/after JSON.
