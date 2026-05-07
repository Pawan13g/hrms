# Feature 002 — Audit Logs Viewer

## Summary

Expose the existing `audit_logs` table through a GraphQL read API and build
frontend pages to browse the audit trail. The write side already works —
every employee mutation calls `audit.Recorder.Record()` which inserts rows
with `entity_type`, `entity_id`, `action`, `changed_by`, `old_data`, `new_data`.
This feature adds the read query, per-entity filtering, and UI.

---

## Current State

### What exists (write side — done)

| Layer | Status | Details |
|-------|--------|---------|
| **DB table** | Done | `audit_logs` — tenant_id, entity_type, entity_id, action, changed_by, old_data (JSONB), new_data (JSONB), created_at |
| **Index** | Done | `(tenant_id, entity_type, entity_id, created_at DESC)` — fast per-entity lookups |
| **Recorder** | Done | `audit.Recorder.Record()` in `internal/audit/recorder.go` — extracts principal from ctx |
| **Employee writes** | Done | `employee/service.go` calls `Audit.Record` on Create, Update, Delete, StatusChange |
| **Permission key** | Done | `audit.read` already in `rbac/registry.go` |

### What's missing (read side)

- No `audit/repo.go` for querying audit_logs
- No GraphQL schema for `AuditLog` type or `auditLogs` query
- No resolver for fetching audit entries
- No frontend pages to display the audit trail
- No per-entity audit section on employee profile
- Org mutations (departments, designations, locations) do NOT write audit logs yet
- Role mutations do NOT write audit logs yet

---

## Architecture

### GraphQL API

```graphql
type AuditLog {
  id: ID!
  entityType: String!
  entityId: ID!
  action: String!              # "create" | "update" | "delete" | "status_change"
  changedBy: ID!
  changedByEmail: String       # resolved from users table for display
  oldData: String              # JSON string — nullable (null on create)
  newData: String              # JSON string — nullable (null on delete)
  createdAt: Int!              # unix seconds
}

type AuditLogConnection {
  entries: [AuditLog!]!
  totalCount: Int!
  hasMore: Boolean!
}

extend type Query {
  """
  Paginated audit logs. Filter by entity or browse all.
  """
  auditLogs(
    entityType: String       # "employee", "department", "designation", "location", "role"
    entityId: ID             # filter to a specific record
    action: String           # filter by action type
    first: Int               # page size (default 50)
    offset: Int              # offset-based pagination (simpler than cursor for audit)
  ): AuditLogConnection! @hasPermission(key: "audit.read")
}
```

### Backend module layout

```
backend/internal/audit/
  recorder.go  — (existing) write side
  repo.go      — (new) read queries
  types.go     — (new) AuditLog domain type
```

No separate service layer needed — the repo reads are simple queries with no
business logic beyond tenant scoping.

### Read query design

Offset pagination (not cursor) is appropriate for audit logs because:
- Users jump to arbitrary pages ("show me changes from last week")
- Total count is useful for "X changes in the last 30 days" display
- Audit logs are append-only; no cursor stability concerns

```sql
SELECT al.id, al.entity_type, al.entity_id, al.action,
       al.changed_by, u.email AS changed_by_email,
       al.old_data, al.new_data, al.created_at
FROM audit_logs al
LEFT JOIN users u ON u.id = al.changed_by
WHERE al.tenant_id = $1
  AND ($2::text IS NULL OR al.entity_type = $2)
  AND ($3::bigint IS NULL OR al.entity_id = $3)
  AND ($4::text IS NULL OR al.action = $4)
ORDER BY al.created_at DESC
LIMIT $5 OFFSET $6
```

### Extending audit writes to org/role mutations

Currently only `employee/service.go` writes audit logs. Extend to:

| Module | Entity type | Actions |
|--------|-------------|---------|
| `department/service.go` | `department` | create, update, delete |
| `designation/service.go` | `designation` | create, update, delete |
| `location/service.go` | `location` | create, update, delete |
| `role/service.go` | `role` | create, update, delete, permission_change |

Each service needs an `*audit.Recorder` injected (same pattern as employee).

### Frontend routes

| Route | Purpose |
|-------|---------|
| `/settings/audit` | Global audit log browser with filters (entity type, action) |
| `/employees/[id]` profile | "Activity" tab showing audit for entity_type=employee, entity_id=id |

### Diff viewer

For update actions, `old_data` and `new_data` are JSONB. The frontend should:
1. Parse both JSON blobs
2. Compute changed fields (diff keys where values differ)
3. Display as a compact "Field X changed from A to B" list
4. Use `<Badge>` for action type: create=success, update=info, delete=destructive, status_change=warning

---

## Constraints

1. **Tenant isolation** — every query scoped by `tenant_id` from JWT
2. **Permission gated** — `audit.read` required to view audit logs
3. **Immutable** — audit_logs has no UPDATE/DELETE exposed; write-once
4. **JSONB nullable** — `old_data` is null on create, `new_data` is null on delete
5. **Performance** — the existing composite index covers the common access pattern; add a date-range index if query plans degrade
6. **changed_by resolution** — LEFT JOIN to users for email display; if user is deleted, show "User #ID" fallback
