# Feature 002 — Audit Logs Viewer Checklist

Derived from `plans/feature/002_audit_logs_plan.md`. Tick only when code lands
and works.

---

## Already done (write side)

- [x] DB table: `audit_logs` with JSONB `old_data`/`new_data` (migration 0019)
- [x] Composite index: `(tenant_id, entity_type, entity_id, created_at DESC)`
- [x] `audit.Recorder.Record()` — inserts rows with principal from ctx
- [x] Employee service calls `Audit.Record` on Create, Update, Delete, StatusChange
- [x] Permission key `audit.read` registered in `rbac/registry.go`

---

## Backend — read side

### Domain types
- [ ] `audit/types.go` — `AuditLog` struct: ID, TenantID, EntityType, EntityID, Action, ChangedBy, ChangedByEmail, OldData, NewData, CreatedAt
- [ ] `AuditLogPage` struct: Entries []AuditLog, TotalCount int, HasMore bool
- [ ] `AuditFilter` struct: EntityType *string, EntityID *int64, Action *string

### Repository
- [ ] `audit/repo.go` — `List(ctx, tenantID, filter, limit, offset)` returning `AuditLogPage`
  - [ ] LEFT JOIN to `users` to resolve `changed_by` → email
  - [ ] Tenant-scoped `WHERE tenant_id = $1`
  - [ ] Optional filters: entity_type, entity_id, action
  - [ ] `ORDER BY created_at DESC` with `LIMIT/OFFSET`
  - [ ] Parallel `SELECT count(*)` for totalCount (with same WHERE)
- [ ] `audit/repo.go` — `CountByEntity(ctx, tenantID, entityType, entityID)` — quick count for badges

### GraphQL schema
- [ ] `schema/audit.graphqls` — types:
  - [ ] `AuditLog` — id, entityType, entityId, action, changedBy, changedByEmail, oldData (String), newData (String), createdAt
  - [ ] `AuditLogConnection` — entries, totalCount, hasMore
- [ ] `schema/audit.graphqls` — query:
  - [ ] `auditLogs(entityType: String, entityId: ID, action: String, first: Int, offset: Int): AuditLogConnection!` gated by `@hasPermission(key: "audit.read")`

### Resolvers
- [ ] `resolver/audit.resolvers.go` — implement `AuditLogs` resolver
  - [ ] Parse filter params, delegate to `audit/repo.List`
  - [ ] Convert `AuditLog` to GQL model (JSONB → String for old_data/new_data)
- [ ] `resolver/resolver.go` — add `AuditRepo *audit.Repo` field (or extend Recorder)
- [ ] `server/server.go` — construct and inject audit repo

### Extend audit writes to org + role modules
- [ ] `department/service.go` — inject `*audit.Recorder`, call `Record` on Create/Update/Delete
- [ ] `designation/service.go` — inject `*audit.Recorder`, call `Record` on Create/Update/Delete
- [ ] `location/service.go` — inject `*audit.Recorder`, call `Record` on Create/Update/Delete
- [ ] `role/service.go` — inject `*audit.Recorder`, call `Record` on:
  - [ ] Create role
  - [ ] Update role
  - [ ] Delete role
  - [ ] SetPermissions (action: "permission_change", old = previous perm list, new = updated list)
  - [ ] AssignUser (action: "user_assign")
  - [ ] RevokeUser (action: "user_revoke")
- [ ] Update `server.go` — pass `audit.Recorder` to department, designation, location, role services

### Tests
- [ ] `audit/repo_test.go` — query with filters returns correct rows
- [ ] Verify org mutation audit writes: create department → check audit_logs row exists
- [ ] Verify role mutation audit writes: setPermissions → check audit_logs has old/new perm snapshots

---

## Frontend — data layer

- [ ] `lib/audit.ts` — types:
  - [ ] `AuditLog` — id, entityType, entityId, action, changedBy, changedByEmail, oldData, newData, createdAt
  - [ ] `AuditLogConnection` — entries, totalCount, hasMore
- [ ] `lib/audit.ts` — hooks:
  - [ ] `useAuditLogs({ entityType?, entityId?, action?, first?, offset? })` — paginated query
  - [ ] Returns connection shape for offset-based pagination

---

## Frontend — global audit page

- [ ] `/settings/audit` — audit log browser page:
  - [ ] Add "Audit Logs" tab to settings layout
  - [ ] Table columns: Timestamp, Entity Type, Entity ID, Action, Changed By (email), Details toggle
  - [ ] Filter bar: entity type Select (all/employee/department/designation/location/role), action Select (all/create/update/delete/status_change)
  - [ ] Offset pagination: "Previous" / "Next" buttons + "Showing X-Y of Z"
  - [ ] Expandable row detail: show diff (old_data vs new_data as field changes)
- [ ] Add "Audit Logs" to locator command palette

---

## Frontend — per-entity audit section

### Employee profile
- [ ] `/employees/[id]` — "Activity" Card section below Direct Reports:
  - [ ] Fetch `useAuditLogs({ entityType: "employee", entityId: id, first: 10 })`
  - [ ] Show latest 10 entries as a timeline list
  - [ ] Each entry: icon by action type + "Field changed from X to Y" or "Created" / "Archived"
  - [ ] "View all" link → `/settings/audit?entityType=employee&entityId=<id>`
  - [ ] Guard: only show if user has `audit.read` permission

### Org entity pages (optional, lower priority)
- [ ] Department detail — "Recent changes" section
- [ ] Designation detail — "Recent changes" section
- [ ] Location detail — "Recent changes" section

### Role detail
- [ ] `/settings/roles/[id]` — "Audit History" Card section:
  - [ ] Show permission changes, user assignments, role edits
  - [ ] Guard: requires both `rbac.manage` and `audit.read`

---

## Frontend — diff viewer component

- [ ] `components/audit/audit-diff.tsx` — shared diff viewer:
  - [ ] Parse `oldData` and `newData` JSON strings
  - [ ] Compute changed keys (fields where values differ)
  - [ ] Render: "**fieldName** changed from `oldValue` → `newValue`"
  - [ ] Handle null (create: "**fieldName** set to `value`", delete: "Record deleted")
  - [ ] Use shadcn Badge for action type coloring:
    - [ ] create → `success`
    - [ ] update → `info`
    - [ ] delete → `destructive`
    - [ ] status_change → `warning`
    - [ ] permission_change → `info`
    - [ ] user_assign / user_revoke → `secondary`

---

## Cross-cutting

- [ ] All audit pages gated by `audit.read` permission (both `@hasPermission` directive + frontend `useHasPermission`)
- [ ] All pages have dark mode support
- [ ] Timestamps rendered with `Intl.DateTimeFormat`
- [ ] Audit page follows shadcn Table + Card patterns
- [ ] No mutation UI on audit logs (read-only by design)

---

## Out of scope

- Audit log export (CSV/PDF) — future feature
- Audit log retention/archival policy — ops concern
- Real-time audit streaming (WebSocket) — future feature
- Field-level diff highlighting (syntax highlight) — v2 polish
- Audit for auth events (login, logout, token refresh) — separate feature
