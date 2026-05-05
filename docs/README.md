# HRMS Employee Module — Docs

Architecture and reference docs for the Employee module of the HRMS.

## Index
- [architecture.md](./architecture.md) — high-level system diagram, components, request lifecycle
- [backend.md](./backend.md) — Go + Gin + gqlgen backend layout, conventions, config
- [frontend.md](./frontend.md) — Next.js + ShadCN frontend layout, codegen, page patterns
- [graphql-schema.md](./graphql-schema.md) — full GraphQL schema for the module
- [database-schema.md](./database-schema.md) — table-by-table notes + **issues found in `schemas/employee.sql`**
- [rbac.md](./rbac.md) — multi-tenancy, roles, permissions, enforcement layers
- [custom-fields.md](./custom-fields.md) — EAV custom-fields system

## Implementation plan
See [`../plans/employee/`](../plans/employee/):
- `00-overview.md` — goals, scope, milestones at a glance
- `01-backend-plan.md` — backend step-by-step
- `02-frontend-plan.md` — frontend step-by-step
- `03-milestones.md` — week-by-week schedule with exit criteria

## Stack at a glance
| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), TypeScript, ShadCN UI, TanStack Query, GraphQL codegen, RHF + Zod |
| API | Gin + gqlgen (GraphQL) at `/graphql`, REST `/auth/*` |
| Backend | Go, sqlc, pgx, go-redis, golang-jwt, golang-migrate |
| Storage | PostgreSQL (multi-tenant, RLS), Redis (cache, refresh tokens) |

## Run the app

> **TL;DR (with the root `Makefile`):**
> ```bash
> make env install up seed   # one-time setup
> make dev                   # backend + frontend + infra in one shot
> ```
> Run `make help` to list every target. The sections below show the equivalent
> raw commands for when you want to skip the Makefile.

### Prerequisites
- Go 1.23+
- Node 20+ and npm
- Docker (for the Postgres + Redis dev stack)

### 1. Start Postgres + Redis
From the repo root:
```bash
docker compose up -d           # or: make up
```
Postgres listens on `localhost:5432` (user/pass/db all `hrms`); Redis on
`localhost:6379`. Both have healthchecks; `docker compose ps` should show
`healthy` before you start the backend.

### 2. Run the backend
```bash
cd backend
cp .env.example .env          # adjust JWT_SECRET for prod
set -a; source .env; set +a   # export every var into the shell
go run ./cmd/server
```
On startup the server applies all `migrations/*.up.sql`, seeds the permission
registry into the `permissions` table, then listens on `:8080`.

Endpoints:
- `GET  /healthz`              — liveness
- `GET  /readyz`               — pings PG + Redis
- `POST /auth/login`           — body `{ email, password, tenantCode }`
- `POST /auth/refresh`         — body `{ refreshToken }`
- `POST /graphql` & `GET /graphql` — gqlgen handler (auth via `Bearer` token)
- `GET  /playground`           — GraphQL playground (dev only)

Smoke-test login (after seeding a tenant + user, see *Seeding* below):
```bash
curl -s localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@acme.test","password":"secret","tenantCode":"acme"}'
```

### 3. Run the frontend
```bash
cd frontend
cp .env.example .env.local     # points at http://localhost:8080 by default
npm install                    # first run only
npm run dev
```
Open http://localhost:3000. `/login` POSTs to the backend `/auth/login` and
stores the token; `/` then calls the `viewer` GraphQL query with the bearer
token to verify the auth + tenant chain end-to-end.

### Useful commands
```bash
# Backend
go vet ./... && go build ./... && go test ./...
go run github.com/99designs/gqlgen generate   # after editing *.graphqls
sqlc generate                                  # after editing queries/*.sql

# Frontend
npm run build      # production build (also runs eslint + tsc)
npm run lint
```

### Seeding (manual, for now)
There is no seed CLI yet. Until M2 lands, create a tenant + admin user
directly in psql:
```sql
INSERT INTO tenants (name, code) VALUES ('Acme', 'acme');
INSERT INTO users (tenant_id, email, password_hash)
VALUES (
  (SELECT id FROM tenants WHERE code='acme'),
  'admin@acme.test',
  -- bcrypt hash for "secret"; regenerate with `htpasswd -bnBC 10 "" secret | tr -d ':\n'`
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
);
```
Roles + role_permissions assignments come with the M2 admin module.

### Troubleshooting
- `migrations failed` on startup — check `DATABASE_URL`; the migrate driver
  needs `sslmode=disable` against the Docker Postgres.
- `tenant mismatch` on `/graphql` — `X-Tenant-Code` header must match the
  tenant whose JWT you presented; either send the right code or omit the
  header to skip the cross-check.
- `unauthenticated` on `viewer` — the access token expires after 15 minutes;
  call `/auth/refresh` with the refresh token to rotate.
