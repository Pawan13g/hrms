# Feature 001 — Roles & Permissions Management

## Summary

Add full RBAC management screens so tenant admins can create roles, assign
permissions, and map users to roles. The founding user already gets a system
"Admin" role with all permissions at registration (implemented in
`backend/internal/auth/register.go`). This feature exposes the CRUD API +
frontend UI for managing additional roles and assignments.

---

## Current State

### What exists

| Layer | Status | Details |
|-------|--------|---------|
| **DB schema** | Done | `roles`, `permissions`, `role_permissions`, `user_roles` tables (migrations 0003-0006) |
| **Permission registry** | Done | `rbac/registry.go` — 7 keys including `rbac.manage` |
| **Seed** | Done | `rbac.Seed()` upserts all permission keys on startup |
| **Directive** | Done | `@hasPermission(key)` directive on GraphQL mutations |
| **JWT claims** | Done | `perms []string` baked into access token at login, read back via `PrincipalFromClaims` |
| **Registration default** | Done | `register.go` creates system "Admin" role → grants ALL permissions → assigns to founding user |
| **Login perm load** | Done | `loadRolesAndPerms()` queries `user_roles` → `role_permissions` → `permissions` and stuffs keys into JWT |
| **Role module** | Done | `modules/role/` with repo, service, guards |
| **Role GraphQL** | Done | Schema, resolvers, 5 queries + 6 mutations |
| **Role frontend** | Done | Settings pages, permission management, assigned users list |
| **Viewer hooks** | Done | `useViewer()`, `useViewerPermissions()`, `useHasPermission()` |
| **Permission guards** | Done | Sidebar filtering, settings layout access denied, global rbac:forbidden toast |

### What's missing — Employee ↔ User link

The `employees` table and `users` table are **separate entities with no FK relationship**:

- `users` — login credentials (email, password_hash) + tenant_id
- `employees` — HR records (code, names, dates, department, etc.) + tenant_id
- Both have `email` + `tenant_id` but no explicit link

This means we cannot show a user's roles on their employee profile page because
there's no way to get from `employee.id` → `user.id` → `user_roles`.

---

## Employee ↔ User Link — Architecture

### Migration: Add `user_id` to employees

```sql
-- 0023_employees_user_id.up.sql
ALTER TABLE employees ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;

-- Backfill: match by email within the same tenant
UPDATE employees e
SET user_id = u.id
FROM users u
WHERE e.email = u.email
  AND e.tenant_id = u.tenant_id
  AND e.user_id IS NULL;
```

The column is nullable because:
- Not every employee has a login account (contractors, interns without system access)
- The FK is optional — admin assigns it explicitly or it's auto-matched by email

### GraphQL changes

```graphql
# Extend Employee type
type Employee {
  ...existing fields...
  userId: ID               # nullable — only set if employee has a linked user account
}

# New mutation to link/unlink
extend type Mutation {
  linkEmployeeUser(employeeId: ID!, userId: ID!): Employee!   @hasPermission(key: "rbac.manage")
  unlinkEmployeeUser(employeeId: ID!): Employee!              @hasPermission(key: "rbac.manage")
}
```

### Backend changes

1. `employee.go` — add `UserID *int64` to `Employee`, `CreateInput`, `UpdateInput`
2. `repo.go` — add `user_id` to SELECT/INSERT/UPDATE queries
3. `employee.graphqls` — add `userId: ID` field + `linkEmployeeUser`/`unlinkEmployeeUser` mutations
4. `employee.resolvers.go` — implement link/unlink resolvers

### Frontend flow

On `/employees/[id]` profile page:
1. Read `employee.userId` from the query
2. If `userId` exists → fetch `useUserRoles(userId)` → show roles as Badges
3. "Assign role" Select → `assignRole({ userId, roleId })` → toast
4. "Remove" button per badge → `revokeRole({ userId, roleId })` → toast
5. If no `userId` → show "No linked user account" with a "Link user" button
6. "Link user" opens a dialog to select a user from the tenant (by email)

### Edge cases

1. **One-to-one constraint** — `employees_user_id` unique index ensures one employee per user
2. **Email mismatch** — after linking, employee.email and user.email may diverge; this is acceptable (HR can update employee email without changing login)
3. **Self-revocation** — reuse existing guard: `RevokeUser` checks `callerUserID == userID` for system roles
4. **Unlinked employees** — employees without `user_id` simply don't show the Roles section; no error

---

## Constraints & Edge Cases

1. **System roles cannot be deleted or renamed** — `is_system = TRUE` rows are immutable.
2. **Admin must always have `rbac.manage`** — prevent removing this permission from the system Admin role.
3. **Self-revocation guard** — prevent a user from removing their own Admin role (would lock themselves out).
4. **Tenant isolation** — roles are tenant-scoped (`tenant_id` column). The `WHERE tenant_id = $tid` clause must be on every query.
5. **Permission sync** — when new permission keys are added to `rbac.All`, the Seed function upserts them. A backfill migration should grant new keys to existing system Admin roles.
6. **JWT refresh** — after role/permission changes, the affected user's JWT won't reflect the change until their next token refresh. Consider showing a banner: "Permissions updated. Changes take effect on next login."
7. **Employee-user link is optional** — not every employee has system access; the `user_id` column is nullable.
