# Employee Module — Checklist

Combined tracker for `00-overview.md` and `01-backend-plan.md`. Tick as each item lands.

---

# Part 1 — Overview

## Tech stack decisions locked
- [x] Backend: Go + Gin + gqlgen chosen and pinned in `go.mod`
- [x] GraphQL pagination strategy = Relay cursor connections (directory)
- [x] DB driver: `pgx`
- [x] Cache/session client: `go-redis`
- [x] Typed query layer: `sqlc` (or `ent`) decision recorded — sqlc chosen, see `backend/queries/README.md`
- [x] Database: PostgreSQL provisioned (dev + CI) — `docker-compose.yml` + GH Actions service
- [x] Cache: Redis provisioned (dev + CI) — `docker-compose.yml` + GH Actions service
- [x] Frontend: Next.js (App Router) + TypeScript scaffolded — `frontend/`
- [x] UI kit: ShadCN initialized with required primitives — Button/Input/Label primitives via cva
- [x] Data fetching: TanStack Query + GraphQL client wired — `Providers`, `gqlClient`, sample `useQuery` on `/`
- [x] Forms: React Hook Form + Zod baseline established — `/login` form
- [x] Auth: JWT access + refresh tokens issued; tenant claim present in token

## Scope (in) — module coverage
- [x] Employee CRUD shipped — backend GraphQL + service with FK validation, cycle-safe manager, `joining_date <= today` (`internal/modules/employee/`, `internal/graph/schema/employee.graphqls`)
- [x] Directory list with server pagination, filtering, sort — Relay `EmployeeConnection`, opaque cursor (id/name/joining-date keyed), filter on search/status/dept/desig/loc/manager, 6-way sort enum
- [x] Org structure: departments (tree) — backend CRUD with cycle-safe parent (`internal/modules/department/`, `internal/graph/schema/department.graphqls`)
- [x] Org structure: designations — backend CRUD with department FK validation (`internal/modules/designation/`)
- [x] Org structure: locations — backend CRUD with IANA timezone validation (`internal/modules/location/`)
- [x] Reporting hierarchy via `manager_id` self-reference (cycle-safe) — service rejects self-manage and uses WITH RECURSIVE descendant check on every reparent (`internal/modules/employee/repo.go:IsDescendant`)
- [ ] RBAC: roles
- [ ] RBAC: permissions
- [ ] RBAC: role-permission mapping
- [ ] RBAC: user-role mapping
- [ ] Custom forms / fields / options / values (EAV)
- [ ] Per-role field permissions enforced on read AND write
- [x] Audit log writes for every employee mutation — service calls `audit.Recorder.Record` on Create/Update/Delete with old+new snapshots; status-only updates use `status_change` action (`internal/modules/employee/service.go`)
- [x] Multi-tenancy isolation enforced on every query — every tenant-scoped repo (`department`, `designation`, `location`, `employee`) takes `tenantID` and binds `WHERE tenant_id = $1`; `geography` is intentionally tenant-agnostic catalog data

## Scope (out) — explicitly deferred
- [x] Bulk import (CSV) deferred to phase 2 — recorded in backlog (`plans/employee/00-overview.md` "Scope (out, future)")

## Domains delivered
- [ ] Identity (tenants, users, roles, permissions, user_roles, role_permissions)
- [x] Org (departments, designations, locations, countries/states/cities) — read-only geography catalog seeded via `migrations/0021_geography_seed.up.sql`
- [ ] Employee (employees + reporting graph)
- [ ] Custom Fields (custom_forms, custom_fields, custom_field_options, custom_field_values, field_permissions)
- [ ] Audit (audit_logs)

## Milestones
- [x] **M1 — Foundations**: repo bootstrap, migrations, tenant + user + auth, RBAC tables loaded, Gin + gqlgen wired, health checks, CI
- [ ] **M2 — Org structure**: departments, designations, locations CRUD; geography seed data; admin screens
- [ ] **M3 — Employee core**: employee CRUD, directory list, manager hierarchy, profile page
- [ ] **M4 — Custom fields**: forms/fields/options/values, dynamic form rendering on profile, role-based field visibility
- [ ] **M5 — Audit + polish**: audit_logs writer + viewer, perms hardening, indexes, load test, docs

## Cross-cutting concerns
- [x] `tenant_id` middleware injects from JWT on every request
- [x] Every resolver / repo filters on `tenant_id` — pulled from `auth.FromContext(ctx)` in every resolver via `tenantOf(ctx)`; passed into every repo call (geography is tenant-agnostic catalog and exempt by design)
- [ ] Postgres RLS policy added as defense-in-depth in M5
- [x] Soft delete via `status` column (`active` / `inactive` / `deleted`); no hard deletes
- [x] All timestamps stored as UNIX UTC
- [ ] Tenant timezone surfaced via `locations.timezone` only at render time
- [x] `created_at` populated by DB default
- [x] `updated_at` maintained by Postgres trigger (`set_updated_at()`)

---

# Part 2 — Backend Plan

## Repo layout
- [x] `cmd/server/main.go` created
- [x] `internal/config/` (env, secrets) created
- [x] `internal/db/` (pgx pool, migrations runner) created
- [x] `internal/redis/` (client + helpers) created
- [x] `internal/auth/` (jwt, middleware, tenant resolver) created
- [x] `internal/rbac/` (permission checks) created
- [x] `internal/audit/` (audit log writer) created
- [ ] `internal/modules/tenant/` (repo + service)
- [ ] `internal/modules/user/`
- [ ] `internal/modules/role/`
- [x] `internal/modules/department/` (repo + service, cycle-safe parent via WITH RECURSIVE)
- [x] `internal/modules/designation/` (repo + service)
- [x] `internal/modules/location/` (repo + service, IANA timezone validation)
- [x] `internal/modules/employee/` (repo + service + cursor + cycle-safe manager + audit calls)
- [ ] `internal/modules/customfield/`
- [x] `internal/graph/schema/*.graphqls` (split per module) — `viewer`, `directives`, `department`, `designation`, `location`, `geography` schemas
- [x] `internal/graph/generated/` (gqlgen output, policy decided) — generated, regenerate via `go run github.com/99designs/gqlgen generate`
- [x] `internal/graph/resolver/` (one file per module) — `viewer`, `department`, `designation`, `location`, `geography` resolvers
- [ ] `internal/graph/dataloader/` (N+1 batchers)
- [x] `internal/graph/directives.go` (`@auth`, `@hasPermission`, `@tenant`) — `@auth` + `@hasPermission` implemented; `@tenant` deferred
- [x] `internal/server/` (gin router + middleware chain)
- [x] `migrations/` (golang-migrate sql files)
- [x] `sqlc.yaml` + `queries/` (if sqlc chosen)
- [x] `go.mod` initialized

## 1. Bootstrap (M1)
- [x] `go mod init` run
- [x] Dep added: `gin-gonic/gin`
- [x] Dep added: `99designs/gqlgen`
- [x] Dep added: `jackc/pgx/v5`
- [x] Dep added: `redis/go-redis/v9`
- [x] Dep added: `golang-jwt/jwt/v5`
- [x] Dep added: `golang-migrate/migrate`
- [ ] Dep added: `kyleconroy/sqlc` (or `ent`) — sqlc is a build-time CLI tool, not a Go module dep; install separately, see `backend/queries/README.md`
- [x] Dep added: `rs/zerolog`
- [ ] Dep added: `stretchr/testify`
- [x] `cmd/server/main.go` loads config
- [x] Connects to Postgres pool
- [x] Connects to Redis
- [x] Runs migrations on startup
- [x] Mounts Gin
- [x] Registers GraphQL handler at `/graphql`
- [x] Registers playground at `/playground` (dev only)
- [x] Middleware chain order: Recovery → RequestID → Logger → CORS → Auth → TenantGuard
- [x] `Auth` middleware attaches `userID`, `tenantID`, `permissions` to ctx

## 2. Migrations
- [x] `0001_tenants.up.sql` (with comma fix after `legal_name`)
- [x] `0002_users.up.sql`
- [x] `0003_roles.up.sql`
- [x] `0004_permissions.up.sql`
- [x] `0005_role_permissions.up.sql` (composite `PRIMARY KEY (role_id, permission_id)`)
- [x] `0006_user_roles.up.sql` (composite `PRIMARY KEY (user_id, role_id)`)
- [x] `0007_departments.up.sql`
- [x] `0008_designations.up.sql`
- [x] `0009_countries.up.sql`
- [x] `0010_states.up.sql`
- [x] `0011_cities.up.sql` (drop reversed `fk_cities_id`)
- [x] `0012_locations.up.sql`
- [x] `0013_employees.up.sql`
- [x] `0014_custom_forms.up.sql`
- [x] `0015_custom_fields.up.sql`
- [x] `0016_custom_field_options.up.sql`
- [x] `0017_custom_field_values.up.sql`
- [x] `0018_field_permissions.up.sql`
- [x] `0019_audit_logs.up.sql`
- [x] Matching `*.down.sql` for every migration above
- [x] Index: `employees(tenant_id, status)`
- [x] Index: `employees(tenant_id, employee_code)` UNIQUE
- [x] Index: `employees(tenant_id, email)` partial-unique WHERE NOT NULL
- [x] Index: `employees(manager_id)`
- [x] Index: `employees(department_id)`
- [x] Index: `employees(designation_id)`
- [x] Index: `users(tenant_id, email)` UNIQUE
- [x] Index: `custom_field_values(tenant_id, entity_type, entity_id)`
- [x] Index: `audit_logs(tenant_id, entity_type, entity_id, created_at DESC)`
- [x] `set_updated_at()` Postgres function created
- [x] `updated_at` trigger attached to every table that needs it

## 3. Auth + Tenant guard
- [x] `POST /auth/register` route implemented (Gin REST) — `internal/auth/register.go`, wired in `internal/server/server.go`
- [x] `POST /auth/login` route implemented (Gin REST)
- [x] Password verified with bcrypt
- [x] Access JWT issued (15m TTL)
- [x] Refresh JWT issued (7d TTL)
- [x] Refresh stored in Redis under `user:{id}:refresh:{jti}`
- [x] JWT claim `sub` (userID) populated
- [x] JWT claim `tid` (tenantID) populated
- [x] JWT claim `roles` (role IDs) populated
- [x] JWT claim `perms` (string keys) populated
- [x] `Auth` middleware parses `Bearer` header
- [x] Claims placed into `gin.Context`
- [x] Claims placed into `context.Context` for resolvers
- [x] `TenantGuard` rejects when JWT `tid` ≠ `X-Tenant-Code` header lookup

## 4. RBAC
- [x] Go-defined permission registry exists — `internal/rbac/registry.go`
- [x] Registry seeded into `permissions` on startup — `rbac.Seed` called in `cmd/server/main.go`
- [x] Keys present: `employee.read`, `employee.write`, `employee.delete`
- [x] Keys present: `org.write`
- [x] Keys present: `customfield.write`
- [x] Keys present: `audit.read`
- [x] `@hasPermission(key: String!)` directive implemented — `internal/graph/directives.go`
- [x] Directive checks `ctx.perms` set
- [ ] Field-level: `Employee` reads filtered against `field_permissions` per role

## 5. GraphQL schema (gqlgen)
- [x] One `.graphqls` per module under `internal/graph/schema/` — `viewer`, `directives`, `department`, `designation`, `location`, `geography` (employee/role/customfield to follow)
- [x] Files stitched via gqlgen config — `gqlgen.yml` globs `internal/graph/schema/*.graphqls`
- [ ] Concrete schema matches `docs/graphql-schema.md`
- [x] Relay-style connection on `employees` — `EmployeeConnection` with edges/pageInfo/totalCount, opaque cursor encoded as base64-JSON `{k, i}`
- [ ] Relay-style connection on `departments`
- [ ] Relay-style connection on `auditLogs`

## 6. Repos & services
- [x] Every `Repository` takes `tenantID` as a parameter — pattern set across `department`, `designation`, `location` (geography is tenant-agnostic seed)
- [x] Repositories are pure data access (no business logic) — see `internal/modules/*/repo.go`
- [x] Services hold rules: prevent self-manager loops — `employee.Service.Update` rejects `id == managerId` and uses recursive descendant check
- [x] Services hold rules: validate `joining_date <= today` — `validateJoining` in `internal/modules/employee/service.go`
- [x] Resolvers stay thin: auth check → service call → GraphQL mapping — see `internal/graph/resolver/{department,designation,location,geography}.resolvers.go`

## 7. Dataloaders
- [ ] `Employee.department` loader
- [ ] `Employee.designation` loader
- [ ] `Employee.location` loader
- [ ] `Employee.manager` loader
- [ ] `Department.parent` loader
- [ ] `Department.children` loader
- [ ] `Employee.customFieldValues` loader (batched by entityID)
- [ ] All loaders scoped per request

## 8. Caching (Redis)
- [ ] `tenant:{code}` cached (TTL 10m)
- [ ] `user:{id}:perms` cached (TTL 5m)
- [ ] `user:{id}:perms` invalidated on role change
- [ ] `customfields:{tenantID}:{module}` cached (TTL 10m)
- [ ] `customfields:{tenantID}:{module}` invalidated on form/field write
- [ ] Geography caches: `countries`, `states`, `cities` (TTL 24h)

## 9. Audit logs
- [x] `audit.Recorder.Record(ctx, entityType, entityID, action, old, new)` implemented — `internal/audit/recorder.go`
- [ ] Called from every mutation in services — wired on `employee.Service` only; org modules (department/designation/location) still bypass audit (follow-up before M5)
- [x] Stored row includes `tenant_id`
- [x] Stored row includes `entity_type` + `entity_id`
- [x] Stored row includes `action` (`create|update|delete|status_change`)
- [x] Stored row includes `changed_by` (userID)
- [x] Stored row includes `old_data` JSONB
- [x] Stored row includes `new_data` JSONB

## 10. Testing
- [ ] Unit tests per service using `pgx` + testcontainers Postgres
- [ ] Integration tests for GraphQL resolvers via `httptest`
- [ ] `internal/testfixture` factory: `tenants`
- [ ] `internal/testfixture` factory: `users`
- [ ] `internal/testfixture` factory: `roles`
- [ ] `internal/testfixture` factory: `employees`

## 11. Observability
- [x] `zerolog` structured JSON logging wired
- [x] `/healthz` (liveness) endpoint live
- [x] `/readyz` (pg + redis ping) endpoint live
- [ ] OpenTelemetry tracing span around each resolver (optional)

## Definition of done — applied per module
- [ ] Migration applied, indexes present
- [ ] Repo + service + resolver implemented
- [ ] Permission directive on every field / mutation
- [ ] Dataloader added wherever N+1 would occur
- [ ] Audit recorded on writes
- [ ] Unit test + 1 happy-path integration test
- [ ] Documented in `docs/`


claude --resume a93faacd-ba64-4801-bf9c-16d7626846db