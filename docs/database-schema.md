# Database Schema — Notes & Issues

Source: `schemas/employee.sql`. Below documents each table, intended use, and **known issues to fix during migration**.

## Issues found in source SQL (must fix when porting to migrations)

| # | File line | Issue | Fix |
|---|---|---|---|
| 1 | `tenants` ~line 7 | Missing comma after `"legal_name" VARCHAR(255)` | Add comma before `created_at` |
| 2 | `role_permissions` | Two columns each declared `PRIMARY KEY` — not a composite key | Use `PRIMARY KEY (role_id, permission_id)` |
| 3 | `user_roles` | Same dual `PRIMARY KEY` mistake; also `user_id` marked `UNIQUE` would prevent multi-role assignment | Use `PRIMARY KEY (user_id, role_id)`; drop the `UNIQUE` |
| 4 | `cities` | `fk_cities_id FOREIGN KEY ("id") REFERENCES "tenants"("city_id")` is reversed and incorrect | Drop this constraint entirely; `tenants.city_id` should FK → `cities.id`, not the inverse |
| 5 | `audit_logs` | No FK on `tenant_id` / `changed_by` | Add FKs to `tenants(id)` and `users(id)` |
| 6 | `custom_field_values` | `entity_type`/`entity_id` polymorphic with no index | Add `(tenant_id, entity_type, entity_id)` index |
| 7 | All tables | No `updated_at` triggers; only default-on-insert | Add Postgres trigger `set_updated_at()` on any table whose `updated_at` should track changes |

## Tables

### `tenants`
Top of the multi-tenant tree. Every other tenant-owned row references `tenants.id`.
- `code` is the public lookup key (used at login: tenantCode + email + password).
- `city_id` → `cities(id)` — HQ city, optional.

### `users`
Authentication identities. `email` should be unique **per tenant**, not globally — add composite unique `(tenant_id, email)`.

### `roles` / `permissions` / `role_permissions` / `user_roles`
Standard RBAC.
- `permissions.key` is the canonical machine name used in code (`employee.read`, ...).
- Seed `permissions` from a Go-defined registry on startup.
- `roles.is_system = true` for built-ins (`Admin`, `HR`, `Manager`, `Employee`); UI prevents editing system roles.
- A user may have multiple roles — fix the `user_roles` schema accordingly.

### `departments`
Self-referencing tree via `parent_id`. Validate no cycles in service layer (recursive CTE).

### `designations`
Belongs to a department (optional). `level` is an integer rank (e.g., 1 = entry, 5 = senior).

### Geography: `countries`, `states`, `cities`
Reference data. Seeded once. Cached aggressively.

### `locations`
A physical office. Ties together country/state/city plus address text. `timezone` used for displaying times to viewers in that location.

### `employees`
The core record.
- `employee_code` should be unique per tenant: add `UNIQUE (tenant_id, employee_code)`.
- `email`: where present, unique per tenant — partial unique index `(tenant_id, email) WHERE email IS NOT NULL`.
- `manager_id` self-references — service-level cycle check.
- `status`: `active` | `inactive` (terminated) | `on_leave` (optional). Soft-delete via `deleted` status, never hard delete.

### `custom_forms` / `custom_fields` / `custom_field_options` / `custom_field_values` / `field_permissions`
EAV system for per-tenant extensibility.
- `custom_forms.module` = `employee`, `department`, ... — namespaces forms.
- `custom_fields.data_type`: `text|number|date|boolean|select|multiselect|json`.
- `custom_field_options` only meaningful when `data_type IN ('select','multiselect')`.
- `custom_field_values` is polymorphic — `(entity_type, entity_id)` resolves to the owning record. Storage column chosen by `data_type`:
  - `text|select` → `value_text`
  - `multiselect|json` → `value_json`
  - `number` → `value_number`
  - `date` → `value_date`
  - `boolean` → `value_text` (`'true'/'false'`) or add a `value_bool` column
- `field_permissions` controls per-role visibility/edit on a field.

### `audit_logs`
Append-only. Resolvers writing entities call `audit.Recorder.Record(...)` in the same transaction.

## Recommended indexes (add in M1/M3 migrations)
```sql
CREATE UNIQUE INDEX users_tenant_email ON users(tenant_id, email);
CREATE UNIQUE INDEX employees_tenant_code ON employees(tenant_id, employee_code);
CREATE UNIQUE INDEX employees_tenant_email ON employees(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX employees_tenant_status ON employees(tenant_id, status);
CREATE INDEX employees_manager ON employees(manager_id);
CREATE INDEX employees_department ON employees(department_id);
CREATE INDEX employees_designation ON employees(designation_id);
CREATE INDEX employees_location ON employees(location_id);

CREATE INDEX departments_tenant_parent ON departments(tenant_id, parent_id);
CREATE INDEX designations_tenant_dept ON designations(tenant_id, department_id);

CREATE INDEX cfv_entity ON custom_field_values(tenant_id, entity_type, entity_id);
CREATE INDEX cfv_field ON custom_field_values(field_id);

CREATE INDEX audit_logs_lookup ON audit_logs(tenant_id, entity_type, entity_id, created_at DESC);
```

## Row-Level Security (M5)
Enable RLS on every tenant-owned table:
```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```
Backend opens each request transaction with `SET LOCAL app.tenant_id = $tid`.

## Conventions
- Primary keys are `SERIAL` (int4). For high-volume tables (`audit_logs`, `custom_field_values`) prefer `BIGSERIAL` or `BIGINT GENERATED ALWAYS AS IDENTITY`.
- Soft delete via `status = 'deleted'`. Queries default to `status <> 'deleted'`.
- All timestamps in UTC.
- All FK columns are nullable unless logically required (e.g., `employees.tenant_id`, `employees.joining_date`).
