# HRMS Employee Module — Architecture

## High-level diagram
```
┌────────────────────┐     HTTPS       ┌──────────────────────────┐
│  Next.js (ShadCN)  │ ──────────────▶ │  Gin HTTP server         │
│  - App Router      │                 │  /auth/* (REST)          │
│  - GraphQL client  │ ◀────────────── │  /graphql (gqlgen)       │
└────────────────────┘                 │  /healthz /readyz        │
                                        └────────────┬─────────────┘
                                                     │
                       ┌─────────────────────────────┼─────────────────────────────┐
                       │                             │                             │
                       ▼                             ▼                             ▼
                ┌────────────┐              ┌───────────────┐             ┌────────────────┐
                │ PostgreSQL │              │     Redis     │             │  Object store  │
                │ (multi-    │              │  - sessions   │             │  (S3-compat,   │
                │  tenant)   │              │  - dataloader │             │   future)      │
                └────────────┘              │  - hot cache  │             └────────────────┘
                                            └───────────────┘
```

## Components
- **Next.js frontend**: server-rendered shell with ShadCN UI, talks GraphQL to backend.
- **Gin server**: HTTP entrypoint. Hosts the GraphQL handler and a thin REST surface for auth.
- **GraphQL layer (gqlgen)**: single endpoint `/graphql`. Schema split per module; resolvers thin; dataloaders prevent N+1.
- **Service layer**: business rules (cycle detection, validation, audit recording).
- **Repository layer**: typed Postgres access (sqlc preferred). Always tenant-scoped.
- **PostgreSQL**: source of truth. Multi-tenant via `tenant_id` columns; RLS enforced at DB.
- **Redis**: short-lived caches, refresh-token store, request-scoped dataloader backing where useful.

## Multi-tenancy model
- **Shared schema, shared tables, `tenant_id` column** on every business table.
- Auth issues a JWT with `tid` claim. Middleware places `tenantID` in `context.Context`.
- Repositories REQUIRE `tenantID` as a parameter — no global queries.
- Postgres RLS policy as backstop: `USING (tenant_id = current_setting('app.tenant_id')::bigint)`. The connection sets `SET LOCAL app.tenant_id = $1` at the start of each request transaction.

## Auth flow
1. `POST /auth/login` { email, tenantCode, password } → backend looks up tenant by code, then user, verifies bcrypt, returns access JWT (15m) + refresh JWT (7d).
2. Refresh stored server-side in Redis: `user:{id}:refresh:{jti}` → `{rotatedAt, ip}`.
3. Frontend stores access token in memory and refresh token in `httpOnly` cookie (preferred) or `localStorage` (acceptable for M1, harden later).
4. On 401 the GraphQL client calls `POST /auth/refresh` once, retries the original request.

## Authorization
- **Coarse**: GraphQL directive `@hasPermission(key: "...")` checks JWT `perms` set.
- **Fine (field level)**: for `Employee` and `CustomFieldValue`, after fetching, filter fields the caller cannot see based on `field_permissions`.
- **Mutation guards**: services re-check on write — never trust the directive alone.

## Audit
- Every mutation passes through `audit.Recorder`. Old / new state captured as JSONB in `audit_logs`. Read via `auditLogs(filter)` query gated by `audit.read`.

## Observability
- `zerolog` JSON logs with `request_id`, `tenant_id`, `user_id`, `op`.
- `/healthz` (process up) and `/readyz` (DB + Redis ping).
- Metrics: Prometheus `/metrics` endpoint (resolver duration histogram, DB pool stats).

## Deployment shape (suggested)
- Single Go binary in a Distroless container.
- Postgres managed (RDS / Cloud SQL).
- Redis managed.
- Next.js as a separate container behind the same edge (Vercel or self-hosted with Node).
- Migrations run as a Kubernetes init job or `golang-migrate` step in CD.
