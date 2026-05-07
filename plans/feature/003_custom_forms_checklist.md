# Feature 003 — Custom Forms, Fields & Custom Modules Checklist

Derived from `plans/feature/003_custom_forms_plan.md`. Tick only when code
lands and works.

---

## Already done (baseline)

- [x] DB tables: `custom_forms`, `custom_fields`, `custom_field_options`, `custom_field_values`, `field_permissions` (migrations 0014-0018)
- [x] Indexes: `custom_forms_tenant_module`, `custom_fields_form_key`, `custom_field_values_lookup`, `field_permissions_role_field`
- [x] Permission key `customfield.write` registered in `rbac/registry.go`

---

## Backend — Custom Modules

### Migration
- [ ] `0025_custom_modules.up.sql`:
  - [ ] `CREATE TABLE custom_modules` (id, tenant_id, slug, name, description, icon, display_order, status, created_at, updated_at)
  - [ ] `CREATE UNIQUE INDEX custom_modules_tenant_slug ON custom_modules(tenant_id, slug)`
  - [ ] `CREATE TABLE custom_module_records` (id, tenant_id, module_id, title, status, created_at, updated_at)
  - [ ] `CREATE INDEX custom_module_records_lookup ON custom_module_records(tenant_id, module_id, status)`
  - [ ] Triggers for `updated_at`
- [ ] `0025_custom_modules.down.sql`

### Module: `internal/modules/custommodule/`

#### Domain types (`module.go`)
- [ ] `CustomModule` struct: ID, TenantID, Slug, Name, Description, Icon, DisplayOrder, Status, RecordCount, CreatedAt, UpdatedAt
- [ ] `ModuleRecord` struct: ID, TenantID, ModuleID, Title, Status, FieldValues, CreatedAt, UpdatedAt
- [ ] `CreateModuleInput`, `UpdateModuleInput`, `CreateRecordInput`, `UpdateRecordInput`

#### Repository (`repo.go`)
- [ ] `ListModules(ctx, tenantID)` — all custom modules with record counts
- [ ] `GetModule(ctx, tenantID, slug)` — single module by slug
- [ ] `GetModuleByID(ctx, tenantID, id)` — single module by ID
- [ ] `CreateModule(ctx, tenantID, input)` — insert (validate slug format: lowercase a-z0-9 hyphens)
- [ ] `UpdateModule(ctx, tenantID, id, input)` — partial update
- [ ] `DeleteModule(ctx, tenantID, id)` — soft-delete module + cascade soft-delete records
- [ ] `ListRecords(ctx, tenantID, moduleID, search?)` — records for a module
- [ ] `GetRecord(ctx, tenantID, recordID)` — single record with field values
- [ ] `CreateRecord(ctx, tenantID, moduleID, input)` — insert record
- [ ] `UpdateRecord(ctx, tenantID, recordID, input)` — partial update
- [ ] `DeleteRecord(ctx, tenantID, recordID)` — soft-delete

#### Service (`service.go`)
- [ ] Validate slug format (lowercase, alphanumeric + hyphens, max 64 chars)
- [ ] Validate slug doesn't collide with system module keys (employee, department, designation, location)
- [ ] Guard: deleting module cascades soft-delete to records
- [ ] Validate icon name against known lucide icon set (optional — warn if unknown)

### GraphQL schema (`schema/custommodule.graphqls`)
- [ ] Types: `CustomModule`, `CustomModuleRecord`
- [ ] Input types: `CreateCustomModuleInput`, `UpdateCustomModuleInput`, `CreateModuleRecordInput`, `UpdateModuleRecordInput`
- [ ] Queries:
  - [ ] `customModules: [CustomModule!]!` — `@auth`
  - [ ] `customModule(slug: String!): CustomModule` — `@auth`
  - [ ] `customModuleRecords(moduleSlug: String!, search: String): [CustomModuleRecord!]!` — `@auth`
  - [ ] `customModuleRecord(id: ID!): CustomModuleRecord` — `@auth`
- [ ] Mutations:
  - [ ] `createCustomModule(input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `updateCustomModule(id, input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `deleteCustomModule(id)` — `@hasPermission(key: "customfield.write")`
  - [ ] `createModuleRecord(input)` — `@auth`
  - [ ] `updateModuleRecord(id, input)` — `@auth`
  - [ ] `deleteModuleRecord(id)` — `@auth`

### Resolvers + wiring
- [ ] `resolver/custommodule.resolvers.go` — wire all queries + mutations
- [ ] `resolver/resolver.go` — add `CustomModuleSvc` field
- [ ] `server/server.go` — construct + inject

---

## Backend — Custom Forms & Fields

### Module: `internal/modules/customform/`

#### Domain types (`form.go`)
- [ ] `Form` struct: ID, TenantID, Name, Module, DisplayOrder, IsSystem, Status, Fields, CreatedAt, UpdatedAt
- [ ] `Field` struct: ID, TenantID, FormID, FieldKey, FieldLabel, DataType, IsRequired, DisplayOrder, ValidationJSON, Status, Options
- [ ] `FieldOption` struct: ID, FieldID, OptionValue, OptionLabel, Status
- [ ] `FieldValue` struct: ID, TenantID, EntityType, EntityID, FieldID, ValueText, ValueNumber, ValueDate, ValueJSON
- [ ] `CreateFormInput`, `UpdateFormInput`, `CreateFieldInput`, `UpdateFieldInput`, `SetValueInput`

#### Repository (`repo.go`)
- [ ] `ListForms(ctx, tenantID, module?)` — all forms, optionally filtered by module, with fields + options
- [ ] `GetForm(ctx, tenantID, formID)` — single form with all fields + options
- [ ] `CreateForm(ctx, tenantID, input)` — insert form
- [ ] `UpdateForm(ctx, tenantID, formID, input)` — partial update
- [ ] `DeleteForm(ctx, tenantID, formID)` — soft-delete (reject if `is_system`)
- [ ] `CreateField(ctx, tenantID, input)` — insert field + bulk-insert options
- [ ] `UpdateField(ctx, tenantID, fieldID, input)` — partial update (reject data_type change if values exist)
- [ ] `DeleteField(ctx, tenantID, fieldID)` — soft-delete
- [ ] `GetFieldValues(ctx, tenantID, entityType, entityID)` — all field values for an entity
- [ ] `SetFieldValues(ctx, tenantID, inputs[])` — upsert field values
- [ ] `GetFieldPermissions(ctx, tenantID, roleID)` — field permissions for a role
- [ ] `SetFieldPermission(ctx, tenantID, roleID, fieldID, canView, canEdit)` — upsert

#### Service (`service.go`)
- [ ] Validate `module` is a system key OR `cm:<slug>` for an active custom module in this tenant
- [ ] Validate `data_type` is one of: text, textarea, number, date, select, multiselect, checkbox, email, phone, url, currency, lookup
- [ ] Validate `validation_json` per data_type (lookup requires `lookup_module` — system key or `cm:<slug>`)
- [ ] Guard: cannot delete system forms
- [ ] Guard: cannot change `data_type` if field has values
- [ ] Guard: cannot delete options with referencing values
- [ ] Validate values against field constraints (is_required, data_type, validation_json)
- [ ] Lookup validation: verify referenced entity ID exists (system entity or custom_module_records)

### GraphQL schema (`schema/customform.graphqls`)
- [ ] Types: `CustomForm`, `CustomField`, `CustomFieldOption`, `CustomFieldValue`
- [ ] Input types: `CreateCustomFormInput`, `UpdateCustomFormInput`, `CreateCustomFieldInput`, `UpdateCustomFieldInput`, `SetFieldValueInput`, `CustomFieldOptionInput`
- [ ] Queries:
  - [ ] `customForms(module: String): [CustomForm!]!` — `@hasPermission(key: "customfield.write")`
  - [ ] `customForm(id: ID!): CustomForm` — `@hasPermission(key: "customfield.write")`
  - [ ] `customFieldValues(entityType: String!, entityId: ID!): [CustomFieldValue!]!` — `@auth`
- [ ] Mutations:
  - [ ] `createCustomForm(input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `updateCustomForm(id, input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `deleteCustomForm(id)` — `@hasPermission(key: "customfield.write")`
  - [ ] `createCustomField(input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `updateCustomField(id, input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `deleteCustomField(id)` — `@hasPermission(key: "customfield.write")`
  - [ ] `setFieldValues(input[])` — `@auth`

### Resolvers + wiring
- [ ] `resolver/customform.resolvers.go` — wire all queries + mutations
- [ ] `resolver/resolver.go` — add `CustomFormSvc` field
- [ ] `server/server.go` — construct + inject

### Tests
- [ ] Create custom module → verify slug uniqueness
- [ ] Create form linked to `cm:assets` → verify module validation
- [ ] Create record in custom module → verify field values stored
- [ ] Lookup field from employee → `cm:assets` → verify cross-module resolution
- [ ] Lookup field from `cm:assets` → employee → verify reverse cross-module
- [ ] Guard: reject slug collision with system module names
- [ ] Guard: reject data_type change when values exist
- [ ] Guard: reject system form deletion
- [ ] Delete custom module → verify cascade soft-delete of records

---

## Frontend — Custom Modules

### Data layer (`lib/custom-modules.ts`)
- [ ] Types: `CustomModule`, `CustomModuleRecord`
- [ ] `useCustomModules()` — list all custom modules
- [ ] `useCustomModule(slug)` — single module
- [ ] `useCustomModuleRecords(slug, search?)` — records for a module
- [ ] `useCustomModuleRecord(id)` — single record with field values
- [ ] `useCreateCustomModule()` — mutation + toast
- [ ] `useUpdateCustomModule()` — mutation + toast
- [ ] `useDeleteCustomModule()` — mutation + toast
- [ ] `useCreateModuleRecord()` — mutation + toast
- [ ] `useUpdateModuleRecord()` — mutation + toast
- [ ] `useDeleteModuleRecord()` — mutation + toast

### Settings — module management

#### Modules list (`/settings/modules`)
- [ ] Add "Modules" tab to settings layout
- [ ] DataTable: Name, Slug, Icon, Record count, Status, Actions
- [ ] "New module" button
- [ ] Edit/Archive actions

#### Create module (`/settings/modules/new`)
- [ ] shadcn Form: slug (auto-generated from name), name, description, icon picker
- [ ] Slug validation: lowercase, a-z0-9 hyphens, no collision with system module names
- [ ] Submit → `createCustomModule` → toast → redirect

#### Module settings (`/settings/modules/[slug]`)
- [ ] Edit name, description, icon
- [ ] List linked forms with "Manage forms" link
- [ ] Archive button

### Module record pages (dynamic routes)

#### Records list (`/modules/[slug]`)
- [ ] DataTable with columns: Title, Status, Created date
- [ ] Search by title
- [ ] "New record" button
- [ ] Row click → record detail

#### Create record (`/modules/[slug]/new`)
- [ ] Form: title (required) + custom fields from linked forms
- [ ] Submit → `createModuleRecord` + `setFieldValues` → toast → redirect

#### Record detail (`/modules/[slug]/[id]`)
- [ ] Header: title, status, timestamps
- [ ] Custom field forms (rendered dynamically from module's forms)
- [ ] Edit/Archive actions

### Sidebar integration
- [ ] Query `useCustomModules()` in sidebar
- [ ] Render each active module as a nav item under a "Modules" separator
- [ ] Use module's `icon` field to show the appropriate lucide icon
- [ ] Active state matches `/modules/[slug]` prefix

### Locator integration
- [ ] Add each custom module to locator pages list
- [ ] Add "New Module" to quick actions

---

## Frontend — Custom Forms & Fields

### Data layer (`lib/custom-forms.ts`)
- [ ] Types: `CustomForm`, `CustomField`, `CustomFieldOption`, `CustomFieldValue`
- [ ] `useCustomForms(module?)` — list forms
- [ ] `useCustomForm(id)` — single form with fields + options
- [ ] `useCustomFieldValues(entityType, entityId)` — values for an entity
- [ ] `useCreateCustomForm()` — mutation + toast
- [ ] `useUpdateCustomForm()` — mutation + toast
- [ ] `useDeleteCustomForm()` — mutation + toast
- [ ] `useCreateCustomField()` — mutation + toast
- [ ] `useUpdateCustomField()` — mutation + toast
- [ ] `useDeleteCustomField()` — mutation + toast
- [ ] `useSetFieldValues()` — mutation + toast

### Settings — form builder

#### Forms list (`/settings/forms`)
- [ ] Add "Custom Forms" tab to settings layout
- [ ] DataTable: Name, Module (badge — system vs custom module name), Field count, Status, Actions
- [ ] Filter by module (faceted filter — includes system + custom modules)
- [ ] "New form" button

#### Create form (`/settings/forms/new`)
- [ ] shadcn Form: name, module Select
- [ ] Module Select options: system modules (employee, department, designation, location) + all active custom modules (`cm:<slug>`)
- [ ] Submit → `createCustomForm` → toast → redirect to builder

#### Form builder (`/settings/forms/[id]`)
- [ ] Form header: name, module badge, status, edit/archive buttons
- [ ] Fields list as sortable cards (drag to reorder `display_order`)
- [ ] Each field card: key, label, data_type badge, required indicator
- [ ] "Add field" button → field editor dialog
- [ ] Edit/Delete per field

#### Field editor dialog
- [ ] Field key (auto-slug from label)
- [ ] Field label
- [ ] Data type Select (text, textarea, number, date, select, multiselect, checkbox, email, phone, url, currency, lookup)
- [ ] Required toggle (Switch)
- [ ] Validation settings (dynamic per data_type):
  - [ ] text/textarea: min_length, max_length
  - [ ] number/currency: min, max
  - [ ] text: regex pattern + pattern_message
  - [ ] lookup: target module Select (system modules + active custom modules)
- [ ] Options editor (for select/multiselect): add/remove option value + label pairs

#### Field permissions (`/settings/forms/[id]/permissions`)
- [ ] Matrix table: rows = fields, columns = roles
- [ ] Each cell: can_view checkbox, can_edit checkbox
- [ ] Save → bulk upsert `field_permissions`
- [ ] Gated by `rbac.manage` + `customfield.write`

### Entity page integration — dynamic custom fields

#### Custom fields tab/section on system entity pages
- [ ] Employee profile (`/employees/[id]`): add "Custom Fields" tab (if forms exist for module=employee)
- [ ] Department (if forms exist for module=department)
- [ ] Designation (if forms exist for module=designation)
- [ ] Location (if forms exist for module=location)

#### Custom field renderer (`components/custom-fields/field-renderer.tsx`)
- [ ] Read mode: display field label + formatted value
- [ ] Edit mode per data_type:
  - [ ] `text` → Input
  - [ ] `textarea` → Textarea
  - [ ] `number` / `currency` → Input type=number
  - [ ] `date` → Input type=date
  - [ ] `select` → shadcn Select with options
  - [ ] `multiselect` → Checkbox group
  - [ ] `checkbox` → Switch
  - [ ] `email` → Input type=email
  - [ ] `phone` → Input type=tel
  - [ ] `url` → Input type=url
  - [ ] `lookup` → Searchable Select from linked module

#### Custom field form (`components/custom-fields/custom-field-form.tsx`)
- [ ] Accepts form definition, current values, entity info
- [ ] Renders fields in display_order
- [ ] Validates required + data_type constraints
- [ ] On save: `setFieldValues` → toast
- [ ] Respects `field_permissions` (can_view / can_edit per role)

#### Lookup field (`components/custom-fields/lookup-field.tsx`)
- [ ] Read `validation_json.lookup_module`:
  - [ ] System module → query `employees`/`departments`/`designations`/`locations`
  - [ ] Custom module (`cm:<slug>`) → query `customModuleRecords(slug, search)`
- [ ] Render searchable Select with entity names/titles
- [ ] Store entity ID in `value_text`
- [ ] Display resolved name in read mode

---

## Cross-cutting

- [ ] All forms use shadcn Form
- [ ] All tables use generic DataTable from `@/components/data-table`
- [ ] All mutations use Sonner toasts
- [ ] All pages use CSS variables (no hardcoded colors)
- [ ] Dark mode support
- [ ] Soft-delete uses "Archive" language
- [ ] Form/module builder gated by `customfield.write`
- [ ] Field values respect per-role `field_permissions`
- [ ] Custom modules appear in sidebar dynamically
- [ ] Lookup fields work cross-module (system ↔ custom ↔ custom)

---

## Out of scope

- File upload fields (requires storage service)
- Calculated/formula fields
- Conditional field visibility (show X if Y = value)
- Custom form versioning
- Bulk import/export of field values
- Custom form templates
- API webhooks on field value changes
- Custom module record-level permissions (beyond field-level)
- Custom module relationships (many-to-many between modules — use lookup fields for now)
