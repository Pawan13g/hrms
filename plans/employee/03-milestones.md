# Milestones & Delivery Schedule

Estimates assume one full-stack engineer + one frontend engineer. Adjust by team shape.

## M1 — Foundations (week 1)
**Backend**
- [ ] Repo bootstrap, config, logger, pg + redis pools
- [ ] Migrations runner + first 5 tables (`tenants`, `users`, `roles`, `permissions`, `user_roles`, `role_permissions`) with schema bug fixes
- [ ] `POST /auth/login`, refresh, `me` query
- [ ] JWT middleware + tenant guard
- [ ] gqlgen wired, `health` query returns "ok"
- [ ] CI: lint, vet, test, build docker image

**Frontend**
- [ ] Next.js bootstrap, ShadCN init, sidebar shell
- [ ] Login screen + token storage + refresh
- [ ] GraphQL codegen pipeline running

**Exit criteria**: an authenticated user can log in and see an empty `/employees` page that calls `me`.

## M2 — Org structure (week 2)
**Backend**
- [ ] Migrations: `departments`, `designations`, `countries`, `states`, `cities`, `locations`
- [ ] Seeds: countries + states (ISO data), India states/cities (or use a public dump)
- [ ] CRUD resolvers + dataloaders for parent/children
- [ ] Permission keys: `org.read`, `org.write`

**Frontend**
- [ ] Departments tree screen (read + add/edit/disable)
- [ ] Designations table
- [ ] Locations table with country/state/city cascading selects

**Exit criteria**: admin can build the org chart and locations.

## M3 — Employee core (week 3)
**Backend**
- [ ] Migration: `employees` (with bug fixes & indexes)
- [ ] Resolvers: `employees` (Relay connection), `employee(id)`, `createEmployee`, `updateEmployee`, `deactivateEmployee`
- [ ] Manager loop validation (no cycles)
- [ ] Dataloaders for department/designation/location/manager
- [ ] Audit recorder integration

**Frontend**
- [ ] Directory list with filters + cursor pagination
- [ ] Create/edit form (Personal + Job + Reporting tabs)
- [ ] Profile page with Overview tab
- [ ] Manager picker (async combobox)

**Exit criteria**: can create 100 employees, search, filter, and view profiles.

## M4 — Custom fields (week 4)
**Backend**
- [ ] Migrations: `custom_forms`, `custom_fields`, `custom_field_options`, `custom_field_values`, `field_permissions`
- [ ] Queries: `customForms(module)`, `customForm(id)`, `customFieldValues(entityType, entityId)`
- [ ] Mutations: `createCustomField`, `setCustomFieldValues` (batched)
- [ ] Field-level permission filter on `Employee` resolvers

**Frontend**
- [ ] Settings → Custom fields editor (form, fields, options, role matrix)
- [ ] `DynamicForm` component on employee profile "Custom Fields" tab

**Exit criteria**: admin can define a custom field "T-shirt size" (select) and any employee profile shows + persists it; users without `view` for that field don't see it.

## M5 — Audit + polish (week 5)
**Backend**
- [ ] Audit log query + filters
- [ ] Postgres RLS policies as defense-in-depth on every tenant table
- [ ] Index review (EXPLAIN ANALYZE on directory list with 100k rows)
- [ ] Load test: 200 RPS on directory query, p95 < 200ms

**Frontend**
- [ ] Audit log viewer with diff
- [ ] Error boundaries, empty states, skeletons across pages
- [ ] Mobile pass

**Exit criteria**: production-ready employee module, docs updated, runbook in `docs/`.

## Risks
- **Custom fields perf**: EAV joins for many fields can blow up. Mitigate by caching the form definition and batching `custom_field_values` per page.
- **Tenant data leak**: easiest class of bug here. Mitigate by RLS + repo-level tests that switch tenant and assert isolation.
- **Manager cycles**: validate on write with a recursive CTE check.
- **GraphQL N+1**: enforce dataloader on every relation; add a request-time logger that counts SQL queries per request and warns above threshold in dev.
