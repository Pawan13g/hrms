# Backend Implementation Plan (Go + Gin + GraphQL)

## Repo layout
```
backend/
├── cmd/server/main.go              # entrypoint
├── internal/
│   ├── config/                     # env, secrets
│   ├── db/                         # pgx pool, migrations runner
│   ├── redis/                      # client + helpers
│   ├── auth/                       # jwt, middleware, tenant resolver
│   ├── rbac/                       # permission checks
│   ├── audit/                      # audit log writer
│   ├── modules/
│   │   ├── tenant/                 # repo + service
│   │   ├── user/
│   │   ├── role/
│   │   ├── department/
│   │   ├── designation/
│   │   ├── location/
│   │   ├── employee/
│   │   └── customfield/
│   ├── graph/
│   │   ├── schema/*.graphqls       # split schemas per module
│   │   ├── generated/              # gqlgen output (gitignored or committed per team policy)
│   │   ├── resolver/               # one file per module
│   │   ├── dataloader/             # N+1 batchers
│   │   └── directives.go           # @auth, @hasPermission, @tenant
│   └── server/                     # gin router, middleware chain
├── migrations/                     # sql files, golang-migrate
├── sqlc.yaml + queries/            # if using sqlc
└── go.mod
```

## Step-by-step

### 1. Bootstrap (M1)
- `go mod init`, add deps: `gin-gonic/gin`, `99designs/gqlgen`, `jackc/pgx/v5`, `redis/go-redis/v9`, `golang-jwt/jwt/v5`, `golang-migrate/migrate`, `kyleconroy/sqlc` (or `ent`), `rs/zerolog`, `stretchr/testify`.
- Wire `cmd/server/main.go`: load config → connect pg + redis → run migrations → mount Gin → register GraphQL handler at `/graphql` and playground at `/playground` (dev only).
- Middleware order: `Recovery` → `RequestID` → `Logger` → `CORS` → `Auth` (parses JWT, attaches `userID`, `tenantID`, `permissions` to ctx) → `TenantGuard`.

### 2. Migrations
- Convert `schemas/employee.sql` into discrete numbered files under `migrations/`:
  - `0001_tenants.up.sql`, `0002_users.up.sql`, ... one table per file.
- **Fix schema bugs while migrating**:
  - `tenants`: add missing comma after `"legal_name" VARCHAR(255)`.
  - `role_permissions`: replace dual `PRIMARY KEY` columns with `PRIMARY KEY (role_id, permission_id)`.
  - `user_roles`: replace dual `PRIMARY KEY` columns with `PRIMARY KEY (user_id, role_id)`.
  - `cities`: drop `fk_cities_id` (references `tenants.city_id` reversed — invalid).
- Add indexes (M1):
  - `employees(tenant_id, status)`, `employees(tenant_id, employee_code)` UNIQUE, `employees(tenant_id, email)` partial-unique where not null, `employees(manager_id)`, `employees(department_id)`, `employees(designation_id)`.
  - `users(tenant_id, email)` UNIQUE.
  - `custom_field_values(tenant_id, entity_type, entity_id)`.
  - `audit_logs(tenant_id, entity_type, entity_id, created_at DESC)`.
- Add `updated_at` trigger (Postgres function `set_updated_at()`).

### 3. Auth + Tenant guard
- `POST /auth/login` (Gin REST, not GraphQL): verify password (`bcrypt`), issue access JWT (15m) + refresh (7d, stored in Redis with `user:{id}:refresh:{jti}`).
- JWT claims: `sub` (userID), `tid` (tenantID), `roles` (role IDs), `perms` (string keys).
- `Auth` middleware: parse Bearer; on success put claims into `gin.Context` AND `context.Context` for resolvers.
- `TenantGuard`: reject any request whose JWT `tid` does not match a `X-Tenant-Code` header lookup (defense in depth).

### 4. RBAC
- `permissions` table seeded at startup from a Go-defined registry: `employee.read`, `employee.write`, `employee.delete`, `org.write`, `customfield.write`, `audit.read`, etc.
- `@hasPermission(key: String!)` GraphQL directive — checks `ctx.perms` set.
- Field-level: when reading `employee` fields, intersect `field_permissions` (per role) with response payload.

### 5. GraphQL schema (gqlgen)
- One `.graphqls` per module under `internal/graph/schema/`. Stitch via gqlgen config.
- See `docs/graphql-schema.md` for the concrete schema.
- Use Relay-style connections for `employees`, `departments`, `auditLogs`.

### 6. Repos & services
- `Repository` = pure data access (sqlc-generated or hand-written `pgx`). Always takes `tenantID`.
- `Service` = business rules (e.g., prevent self-manager loops, validate join date ≤ today).
- `Resolver` = thin: auth check → call service → map to GraphQL type.

### 7. Dataloaders
- Required to avoid N+1 in:
  - `Employee.department`, `Employee.designation`, `Employee.location`, `Employee.manager`.
  - `Department.parent`, `Department.children`.
  - `Employee.customFieldValues` (batched by entityID).
- One loader per resolver type, scoped per request.

### 8. Caching (Redis)
- `tenant:{code}` → tenant row (TTL 10m).
- `user:{id}:perms` → permission set (TTL 5m, invalidated on role change).
- `customfields:{tenantID}:{module}` → schema definition (TTL 10m, invalidated on form/field write).
- Geography (`countries`, `states`, `cities`) cached for 24h — they barely change.

### 9. Audit logs
- `audit.Recorder.Record(ctx, entityType, entityID, action, old, new)` called from every mutation in services.
- Stored row: `tenant_id`, `entity_type`, `entity_id`, `action` (`create|update|delete|status_change`), `changed_by` (userID), `old_data` / `new_data` JSONB.

### 10. Testing
- Unit tests per service with `pgx`+`testcontainers-go` Postgres.
- Integration tests for GraphQL resolvers via `httptest`.
- Seed fixtures: `tenants/users/roles/employees` factory under `internal/testfixture`.

### 11. Observability
- `zerolog` structured JSON.
- `/healthz` (liveness), `/readyz` (checks pg + redis).
- Optional: OpenTelemetry tracing with span around each resolver.

## Definition of done per module
- Migration applied, indexes present
- Repo + service + resolver implemented
- Permission directive on every field/mutation
- Dataloader where it would N+1
- Audit recorded on writes
- Unit + 1 happy-path integration test
- Documented in `docs/`
