# sqlc queries

Decision: **sqlc** over ent. Rationale: hand-authored SQL stays the source of
truth (we already have rich migrations + schema docs), and sqlc only generates
typed Go bindings from it — no ORM runtime, no model drift risk.

`sqlc` is a build-time tool; it is **not** added to `go.mod`. Install it once
locally, then generated Go lands in `internal/db/sqlc/`.

```bash
# Install (one-time, per developer machine)
go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.27.0

# Regenerate after editing any *.sql file in this directory
sqlc generate
```

Each module owns one `<module>.sql` file. Keep query names PascalCase and
prefixed with the verb (`GetUserForLogin`, `ListEmployees`, etc).
