# Feature 003 — Custom Forms, Fields & Custom Modules

## Summary

Build a form builder that lets tenant admins create custom data-capture forms
and link them to **system modules** (employees, departments, designations,
locations) **or user-created custom modules** (e.g. "Assets", "Training",
"Projects", "Vehicles"). Each form contains typed fields (text, number, date,
select, lookup, etc.) that store values against entity records. Lookup fields
can cross-reference any module — system or custom. Per-role field-level
permissions control who can view/edit which fields.

---

## Current State

### What exists (DB schema — migrations 0014-0018)

| Table | Purpose |
|-------|---------|
| `custom_forms` | Form definitions — `tenant_id`, `name`, `module` (e.g. "employee"), `display_order`, `is_system`, `status` |
| `custom_fields` | Field definitions — `form_id`, `field_key`, `field_label`, `data_type`, `is_required`, `display_order`, `validation_json` |
| `custom_field_options` | Dropdown/radio options for select-type fields — `field_id`, `option_value`, `option_label` |
| `custom_field_values` | Actual data — `entity_type`, `entity_id`, `field_id`, `value_text`, `value_number`, `value_date`, `value_json` |
| `field_permissions` | Per-role field visibility — `role_id`, `field_id`, `can_view`, `can_edit` |

### What exists (RBAC)

- `customfield.write` permission key already registered in `rbac/registry.go`

### What's missing

- No `custom_modules` table for user-defined modules
- No Go modules (`internal/modules/customform/`, `internal/modules/custommodule/`)
- No GraphQL schema for custom forms/fields/modules
- No resolvers or frontend

---

## Architecture

### Custom Modules

Users can create their own modules beyond the 4 system ones. A custom module
is a tenant-scoped entity type with its own record table, forms, and fields.

**New table: `custom_modules`**

```sql
CREATE TABLE custom_modules (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug          VARCHAR(64)  NOT NULL,     -- url-safe key, e.g. "assets", "training"
    name          VARCHAR(255) NOT NULL,     -- display name, e.g. "Assets"
    description   TEXT,
    icon          VARCHAR(64),               -- lucide icon name, e.g. "laptop", "book-open"
    display_order INTEGER      NOT NULL DEFAULT 0,
    status        VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX custom_modules_tenant_slug ON custom_modules(tenant_id, slug);
```

Custom module records store all their data via `custom_field_values` — the
`entity_type` column uses the module slug (e.g. `"cm:assets"`) and `entity_id`
references `custom_modules.id`.

### Module registry (system + custom)

The form builder and lookup fields need a unified list of available modules:

| Type | Module key | Source | Entity table |
|------|-----------|--------|-------------|
| System | `employee` | Hardcoded | `employees` |
| System | `department` | Hardcoded | `departments` |
| System | `designation` | Hardcoded | `designations` |
| System | `location` | Hardcoded | `locations` |
| Custom | `cm:<slug>` | `custom_modules` table | `custom_module_records` |

The `cm:` prefix distinguishes custom modules from system modules in
`entity_type` columns and form `module` references.

### Form Sections

Forms are divided into **sections** to visually group related fields. Each
section renders as a collapsible Card with a title and optional description.

**Hierarchy: Form → Sections → Fields**

**New table: `custom_form_sections`**

```sql
CREATE TABLE custom_form_sections (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    form_id         BIGINT       NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    is_collapsible  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default_open BOOLEAN      NOT NULL DEFAULT TRUE,
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX custom_form_sections_form ON custom_form_sections(form_id);
```

**Migration to link fields to sections:**

```sql
ALTER TABLE custom_fields ADD COLUMN section_id BIGINT
    REFERENCES custom_form_sections(id) ON DELETE SET NULL;
```

Fields with `section_id = NULL` appear in an implicit "Unsectioned" group at
the top of the form (backward compatible with fields that predate sections).

**Key behaviors:**
- Creating a new form auto-creates a default "General" section
- Deleting a section sets `section_id = NULL` on its fields (fields are NOT deleted)
- Sections and fields each have `display_order` for sorting within their parent

**How sections render on entity pages:**

```
┌─ Employee Onboarding Form ──────────────────────┐
│                                                   │
│  ▾ Personal Details              [section 1]      │
│  ┌───────────────────────────────────────────┐    │
│  │  Blood Group:  [Select ▾]                 │    │
│  │  Emergency Contact:  [____________]       │    │
│  │  Emergency Phone:    [____________]       │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ▾ Equipment & Access            [section 2]      │
│  ┌───────────────────────────────────────────┐    │
│  │  Laptop Assigned:  [Lookup → cm:assets ▾] │    │
│  │  Badge ID:         [____________]         │    │
│  │  Access Card:      [☐]                    │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ▸ Bank Details (collapsed)      [section 3]      │
│                                                   │
└───────────────────────────────────────────────────┘
```

**GraphQL types:**

```graphql
type CustomFormSection {
  id: ID!
  formId: ID!
  name: String!
  description: String
  displayOrder: Int!
  isCollapsible: Boolean!
  isDefaultOpen: Boolean!
  status: String!
  fields: [CustomField!]!
}

type CustomForm {
  id: ID!
  name: String!
  module: String!
  displayOrder: Int!
  isSystem: Boolean!
  status: String!
  sections: [CustomFormSection!]!   # replaces flat fields list
  createdAt: Int!
  updatedAt: Int!
}

input CreateSectionInput {
  formId: ID!
  name: String!
  description: String
  displayOrder: Int
  isCollapsible: Boolean
  isDefaultOpen: Boolean
}

input UpdateSectionInput {
  name: String
  description: String
  displayOrder: Int
  isCollapsible: Boolean
  isDefaultOpen: Boolean
  status: String
}
```

### How custom modules work end-to-end

1. **Admin creates a custom module** (e.g. slug="assets", name="Company Assets")
2. Module appears in sidebar under a "Org Structure" section
3. **Admin creates a form** linked to module `cm:assets`
4. Admin adds sections to the form (e.g. "General", "Assignment Details")
5. Admin adds fields to each section (e.g. "Asset Tag" in General, "Assigned To" as lookup→employee in Assignment Details)
6. **Users navigate to `/modules/assets`** — see a DataTable of all records
6. Users create a record with a fields data that is configured in form (e.g. "MacBook Pro #1234")
7. The record detail page shows the fields of form for data entry
8. Lookup fields resolve to system or other custom module records

### Supported field types (`data_type`)

| Type | Storage column | UI Component | Description |
|------|---------------|--------------|-------------|
| `text` | `value_text` | Input | Single-line text |
| `textarea` | `value_text` | Textarea | Multi-line text |
| `number` | `value_number` | Input type=number | Numeric value |
| `date` | `value_date` | Input type=date | Date picker |
| `select` | `value_text` | shadcn Select | Single select from options |
| `multiselect` | `value_json` | Checkbox group | Multiple select, stored as JSON array |
| `checkbox` | `value_text` | Checkbox | Boolean ("true"/"false") |
| `email` | `value_text` | Input type=email | Email with validation |
| `phone` | `value_text` | Input | Phone number |
| `url` | `value_text` | Input type=url | URL with validation |
| `currency` | `value_number` | Input | Monetary amount |
| `lookup` | `value_text` | Select (linked) | References any module entity (system or custom) |

### Lookup field — system + custom module support

A lookup field's `validation_json` specifies the target module:

```json
// Lookup to a system module
{ "lookup_module": "employee", "lookup_display": "name" }

// Lookup to a custom module
{ "lookup_module": "cm:assets", "lookup_display": "title" }
```

For system modules, the frontend queries the existing GraphQL endpoints.
For custom modules, it queries `customModuleRecords(moduleSlug, search)`.

### GraphQL API — custom modules

```graphql
type CustomModule {
  id: ID!
  slug: String!
  name: String!
  description: String
  icon: String
  displayOrder: Int!
  status: String!
  recordCount: Int!
  createdAt: Int!
}

type CustomModuleRecord {
  id: ID!
  moduleId: ID!
  title: String!
  status: String!
  fieldValues: [CustomFieldValue!]!
  createdAt: Int!
  updatedAt: Int!
}

input CreateCustomModuleInput {
  slug: String!
  name: String!
  description: String
  icon: String
}

input UpdateCustomModuleInput {
  name: String
  description: String
  icon: String
  displayOrder: Int
  status: String
}

input CreateModuleRecordInput {
  moduleSlug: String!
  title: String!
}

input UpdateModuleRecordInput {
  title: String
  status: String
}

extend type Query {
  customModules: [CustomModule!]!                                @auth
  customModule(slug: String!): CustomModule                      @auth
  customModuleRecords(moduleSlug: String!, search: String): [CustomModuleRecord!]!  @auth
  customModuleRecord(id: ID!): CustomModuleRecord                @auth
}

extend type Mutation {
  createCustomModule(input: CreateCustomModuleInput!): CustomModule!    @hasPermission(key: "customfield.write")
  updateCustomModule(id: ID!, input: UpdateCustomModuleInput!): CustomModule!  @hasPermission(key: "customfield.write")
  deleteCustomModule(id: ID!): Boolean!                                @hasPermission(key: "customfield.write")
  createModuleRecord(input: CreateModuleRecordInput!): CustomModuleRecord!  @auth
  updateModuleRecord(id: ID!, input: UpdateModuleRecordInput!): CustomModuleRecord!  @auth
  deleteModuleRecord(id: ID!): Boolean!                                @auth
}
```

### Frontend routes — custom modules

| Route | Purpose |
|-------|---------|
| `/settings/modules` | List custom modules + create new |
| `/settings/modules/new` | Create module — slug, name, icon |
| `/settings/modules/[slug]` | Module settings — edit name, manage forms |
| `/modules/[slug]` | Module records DataTable (dynamic route) |
| `/modules/[slug]/new` | Create record |
| `/modules/[slug]/[id]` | Record detail — custom field forms |

### Sidebar integration

Custom modules appear in the sidebar under a "Modules" separator:

```
Dashboard
Employees
Org Structure
Locations
─────────
Assets        (custom, icon from custom_modules.icon)
Training      (custom)
─────────
Settings
```

The sidebar queries `customModules` and renders each active module as a nav
item with its chosen icon.

---

## Constraints & Edge Cases

1. **Tenant isolation** — modules, records, forms, fields, values all scoped by `tenant_id`
2. **Slug uniqueness** — module `slug` unique per tenant; validated as lowercase alphanumeric + hyphens
3. **Module validation** — form `module` must be a system module key or `cm:<slug>` for an active custom module
4. **Field key uniqueness** — `field_key` unique within a form (DB index)
5. **System forms** — `is_system = true` forms cannot be deleted
6. **Soft delete** — modules, forms, fields soft-delete; values remain for audit
7. **Data type immutability** — cannot change `data_type` after values exist
8. **Custom module deletion** — deleting a module soft-deletes all its records, forms, and field values
9. **Lookup cross-module** — lookup fields can reference any module (system or custom); deleting the target module's records shows "Deleted record" in the lookup display
10. **Display order** — modules sorted by `display_order` in sidebar; sections sorted within form; fields sorted within section
11. **Icon safety** — module icon validated against a known set of lucide icon names
12. **Record title** — every custom module record has a required `title` field as the primary display value; additional data captured via custom form fields
13. **Section ordering** — sections sorted by `display_order` within a form; fields sorted by `display_order` within a section
14. **Unsectioned fields** — fields with `section_id = NULL` render in an implicit "General" group at top (backward compatible)
15. **Section deletion** — deleting a section sets `section_id = NULL` on its fields (moves to unsectioned) — fields are NOT deleted
16. **Default section** — creating a new form auto-creates a "General" section
