# Employee Module — Implementation Plan (Overview)

## Goal
Build the Employee module for a multi-tenant HRMS, covering employee directory, org structure (departments, designations, locations), RBAC, and an extensible custom-fields system, exposed via GraphQL and a Next.js admin UI.

## Tech Stack
- **Backend**: Go, Gin (HTTP), gqlgen (GraphQL) with Relay cursors for the directory, `pgx` (Postgres), `go-redis` (cache/session), `sqlc` or `ent` for typed queries
- **Database**: PostgreSQL
- **Cache**: Redis (auth sessions, dataloader, hot lookups)
- **Frontend**: Next.js (App Router), TypeScript, ShadCN UI, TanStack Query + GraphQL client (`graphql-request` or `urql`), React Hook Form + Zod
- **Auth**: JWT access + refresh tokens, RBAC enforced at GraphQL resolver layer, tenant scoped via `tenant_id` claim

## Scope (in)
- Employee CRUD + directory list (server pagination, filtering, sort)
- Org structure: departments (tree), designations, locations
- Reporting hierarchy via `manager_id` self-reference
- RBAC: roles, permissions, role-permission, user-role
- Custom forms / fields / options / values (EAV) with per-role field permissions
- Audit log writes for all employee mutations
- Multi-tenancy isolation on every query

## Scope (out, future)
- Bulk import (CSV) — phase 2

## Modules / Domains
1. **Identity**: tenants, users, roles, permissions, user_roles, role_permissions
2. **Org**: departments, designations, locations, countries/states/cities
3. **Employee**: employees + reporting graph
4. **Custom Fields**: custom_forms, custom_fields, custom_field_options, custom_field_values, field_permissions
5. **Audit**: audit_logs

## Milestones
- **M1 — Foundations** (week 1): repo bootstrap, migrations, tenant + user + auth, RBAC tables loaded, Gin + gqlgen wired, health checks, CI.
- **M2 — Org structure** (week 2): departments, designations, locations CRUD; geography seed data; admin screens.
- **M3 — Employee core** (week 3): employee CRUD, directory list, manager hierarchy, profile page.
- **M4 — Custom fields** (week 4): forms/fields/options/values, dynamic form rendering on profile, role-based field visibility.
- **M5 — Audit + polish** (week 5): audit_logs writer + viewer, perms hardening, indexes, load test, docs.

## Cross-cutting concerns
- Every table has `tenant_id` — middleware injects it from the JWT and resolvers MUST filter on it. Add a Postgres RLS policy as a defense-in-depth layer in M5.
- Soft delete via `status` column (`active` / `inactive` / `deleted`); never hard-delete.
- All timestamps in UNIX UTC; surface tenant timezone via `locations.timezone` only at render time.
- `created_at` / `updated_at` populated by DB; `updated_at` maintained by trigger.