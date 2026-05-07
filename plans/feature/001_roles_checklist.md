# Feature 001 — Roles & Permissions Checklist

Derived from `plans/feature/001_roles_plan.md`. Tick only when code lands and
works — per `feedback_no_blind_checklist_ticks`.

---

## Already done (baseline)

- [x] DB tables: `roles`, `permissions`, `role_permissions`, `user_roles` (migrations 0003-0006)
- [x] Permission registry with 7 keys in `rbac/registry.go`, seeded on startup via `rbac.Seed()`
- [x] `@hasPermission(key)` GraphQL directive wired in `graph/directives.go`
- [x] JWT carries `perms []string` — loaded at login via `loadRolesAndPerms()`
- [x] Registration creates system "Admin" role with ALL permissions and assigns to founding user (`register.go`)

---

## Backend — done

### Permission registry
- [x] Add `rbac.manage` permission key to `rbac.All` in `registry.go`
- [x] Backfill migration: `0022_backfill_admin_permissions`

### Module: `internal/modules/role/`
- [x] `role.go` — domain types
- [x] `repo.go` — 11 Postgres query methods (including `UsersWithRole`)
- [x] `service.go` — business guards (system role immutability, rbac.manage protection, self-revocation prevention)

### GraphQL schema
- [x] `schema/role.graphqls` — types + 5 queries + 6 mutations
- [x] `resolver/role.resolvers.go` — all 11 resolver methods
- [x] `resolver/resolver.go` + `server/server.go` — DI wiring

---

## Backend — remaining

### Tests
- [ ] `role/service_test.go` — unit tests:
  - [ ] Create role with permissions → verify permissions stored
  - [ ] Update role name/description → verify updated
  - [ ] Delete non-system role → verify soft-deleted
  - [ ] SetPermissions → verify old perms removed, new perms added
  - [ ] AssignUser + RevokeUser → verify user_roles rows
- [ ] Guard tests:
  - [ ] Attempt to delete system role → expect error "cannot delete a system role"
  - [ ] Attempt to rename system role → expect error "cannot rename a system role"
  - [ ] Attempt to remove `rbac.manage` from system Admin → expect error
  - [ ] Attempt to self-revoke system role → expect error "cannot revoke your own system admin role"
- [ ] Integration test: create role → assign permissions → assign user → login as that user → verify JWT contains new perms

### Employee ↔ User auto-link
- [x] Migration `0023_employees_user_id.up.sql` — ALTER TABLE + unique index + backfill by email
- [x] Migration `0023_employees_user_id.down.sql` — DROP COLUMN
- [x] `employee.go` — added `UserID *int64` to `Employee`
- [x] `repo.go` — added `user_id` to `selectCols` + `scan` + `FindUserByEmail` + `SetUserID` methods
- [x] `employee.graphqls` — added `userId: ID` to Employee type
- [x] `employee.resolvers.go` — mapped `UserID` in `toGQLEmployee()`
- [x] `employee/service.go` — auto-links user on Create when email matches a user in the same tenant
- [x] Removed manual `linkEmployeeUser`/`unlinkEmployeeUser` mutations (auto-link only)

---

## Frontend — done

### Data layer
- [x] `lib/roles.ts` — 11 TanStack Query hooks (queries + mutations with cache invalidation)
- [x] `lib/viewer.ts` — `useViewer()`, `useViewerPermissions()`, `useHasPermission()`

### Pages — Settings > Roles
- [x] `/settings` layout with tab navigation + permission guard (Access denied if no `rbac.manage`)
- [x] `/settings/roles` — roles list with Table, Badges, System lock icon
- [x] `/settings/roles/new` — create form with permission Checkbox grid
- [x] `/settings/roles/[id]` — detail page with permission toggles + save + assigned users table + revoke action
- [x] `/settings/roles/[id]/edit` — edit name/description form

### Permission guards
- [x] `useViewer()` + `useViewerPermissions()` + `useHasPermission()` hooks — `lib/viewer.ts`
- [x] Sidebar hides "Settings" when user lacks `rbac.manage`
- [x] Settings layout shows "Access denied" if no `rbac.manage`
- [x] Global `gqlRequest()` interceptor shows toast on `rbac: forbidden`

### Locator
- [x] "Roles & Permissions" + "New Role" in Cmd+K palette

---

## Frontend — remaining

### Employee profile with Tabs + RBAC-gated Roles tab
- [x] `lib/employees.ts` — added `userId` field to `Employee` type + `userId` in both GQL queries
- [x] Removed manual link/unlink hooks and mutations (auto-link only)
- [x] `/employees/[id]` profile page — restructured with shadcn Tabs:
  - [x] **Profile tab** — Personal info + Employment details + timestamps (default)
  - [x] **Roles & Access tab** — gated by `rbac.manage` permission (hidden if user lacks it):
    - [x] If `employee.userId` is null → "No linked user account" info message
    - [x] If `employee.userId` exists → shows linked User ID + assigned role Badges with X remove
    - [x] Assign role Select dropdown → `useAssignRole` → toast (only unassigned roles shown)
    - [x] Self-revocation guard: disable remove on Admin when viewing own user
  - [x] **Direct Reports tab** — only shown when employee has reports

### Audit logs
- [ ] See `plans/feature/002_audit_logs_plan.md` and `002_audit_logs_checklist.md` for full plan
- [ ] Role mutations write audit entries (role create/update/delete, permission_change, user_assign, user_revoke)
- [ ] Role detail page shows "Audit History" section

---

## Cross-cutting — done
- [x] All forms use shadcn Form
- [x] All mutations use Sonner toasts
- [x] All pages have dark mode
- [x] Soft-delete uses "Archive" language
- [x] Permission changes show "Changes take effect on next login" info toast

---

## Out of scope
- Per-field permissions on employee records (depends on custom fields M4)
- Role hierarchy / inheritance (keep flat for v1)
- Invitation flow with role pre-assignment (future feature)
