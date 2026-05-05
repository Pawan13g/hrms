# Backend (Go + Gin + GraphQL)

## Stack
- **Language**: Go
- **HTTP**: Gin
- **GraphQL**: gqlgen (schema-first)
- **DB driver**: `jackc/pgx/v5` connection pool
- **Typed SQL**: `sqlc` (recommended) generating from `queries/*.sql`
- **Cache/session**: `go-redis/v9`
- **JWT**: `golang-jwt/jwt/v5`
- **Migrations**: `golang-migrate/migrate`
- **Logging**: `rs/zerolog`
- **Testing**: `stretchr/testify` + `testcontainers-go` for Postgres

## Layered design
```
Handler / Resolver
    │ depends on
    ▼
Service (business rules, cross-aggregate logic)
    │ depends on
    ▼
Repository (sqlc-generated, scoped per table)
    │ depends on
    ▼
pgxpool.Pool / *redis.Client
```
Resolvers must not call repositories directly — go through services so audit and validation are guaranteed.

## Request lifecycle
1. Gin receives request, runs middleware chain:
   - `RequestID` → assigns `X-Request-ID`
   - `Logger` → structured access log
   - `Recovery` → panic to 500
   - `CORS`
   - `Auth` → parses JWT, attaches `userID`, `tenantID`, `permissions` to `context.Context`
   - `TenantTx` → begins a pg transaction and `SET LOCAL app.tenant_id = $tid`. Resolvers borrow this tx via context.
2. GraphQL handler dispatches to resolver.
3. Resolver checks permission directive → calls service → returns DTO.
4. On success middleware commits tx; on error rolls back.
5. Audit rows written in the same tx so audit and data move together.

## Module template
For every domain module (`employee`, `department`, ...):
```
internal/modules/<name>/
├── model.go        # domain structs (separate from gqlgen models if needed)
├── repository.go   # interface + sqlc impl
├── service.go      # business rules, calls audit.Recorder
├── service_test.go
└── errors.go       # typed errors mapped to GraphQL extensions
```

## Error model
- Domain errors implement `error` and carry a stable `code` (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `VALIDATION`).
- Resolvers translate to GraphQL errors with `extensions.code` set; HTTP stays 200 (GraphQL convention).

## Configuration
Env vars (all required unless marked optional):
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` (HS256) or `JWT_PRIVATE_KEY` (RS256, preferred prod)
- `JWT_ACCESS_TTL` (e.g. `15m`)
- `JWT_REFRESH_TTL` (e.g. `168h`)
- `LOG_LEVEL` (default `info`)
- `PORT` (default `8080`)
- `CORS_ORIGINS` (comma-sep)
- `ENV` (`dev|staging|prod`) — controls playground enable

## Caching strategy (Redis keys)
| Key | TTL | Invalidation |
|---|---|---|
| `tenant:{code}` | 10m | on tenant update |
| `user:{id}:perms` | 5m | on user_roles or role_permissions change |
| `customforms:{tenantID}:{module}` | 10m | on form/field write |
| `geo:countries` | 24h | manual |
| `geo:states:{countryID}` | 24h | manual |
| `geo:cities:{stateID}` | 24h | manual |
| `refresh:{userID}:{jti}` | matches refresh TTL | on logout / rotate |

## Migrations
Stored under `migrations/`, numbered. Each migration has `.up.sql` and `.down.sql`. Apply at startup behind a leader-election lock (or as a separate job in CD).

## Tests
- `repository_test.go`: integration against testcontainers Postgres.
- `service_test.go`: in-memory or testcontainers; asserts validation rules and audit records.
- `resolver_test.go`: spins gqlgen handler over `httptest`, checks permission gating.
- Coverage target: 70% on services, smoke for resolvers.
