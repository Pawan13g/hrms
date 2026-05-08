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

## Backend — Custom Forms, Sections & Fields

### Migration
- [ ] `0026_custom_form_sections.up.sql`:
  - [ ] `CREATE TABLE custom_form_sections` (id, tenant_id, form_id, name, description, display_order, is_collapsible, is_default_open, status, created_at, updated_at)
  - [ ] `CREATE INDEX custom_form_sections_form ON custom_form_sections(form_id)`
  - [ ] `ALTER TABLE custom_fields ADD COLUMN section_id BIGINT REFERENCES custom_form_sections(id) ON DELETE SET NULL`
  - [ ] Trigger for `updated_at` on `custom_form_sections`
- [ ] `0026_custom_form_sections.down.sql`

### Module: `internal/modules/customform/`

#### Domain types (`form.go`)
- [ ] `Form` struct: ID, TenantID, Name, Module, DisplayOrder, IsSystem, Status, Sections, CreatedAt, UpdatedAt
- [ ] `FormSection` struct: ID, TenantID, FormID, Name, Description, DisplayOrder, IsCollapsible, IsDefaultOpen, Status, Fields, CreatedAt, UpdatedAt
- [ ] `Field` struct: ID, TenantID, FormID, SectionID, FieldKey, FieldLabel, DataType, IsRequired, DisplayOrder, ValidationJSON, Status, Options
- [ ] `FieldOption` struct: ID, FieldID, OptionValue, OptionLabel, Status
- [ ] `FieldValue` struct: ID, TenantID, EntityType, EntityID, FieldID, ValueText, ValueNumber, ValueDate, ValueJSON
- [ ] `CreateFormInput`, `UpdateFormInput`
- [ ] `CreateSectionInput`, `UpdateSectionInput`
- [ ] `CreateFieldInput` (includes `SectionID`), `UpdateFieldInput`, `SetValueInput`

#### Repository (`repo.go`)

**Forms:**
- [ ] `ListForms(ctx, tenantID, module?)` — all forms with sections → fields → options
- [ ] `GetForm(ctx, tenantID, formID)` — single form with sections → fields → options
- [ ] `CreateForm(ctx, tenantID, input)` — insert form + auto-create default "General" section
- [ ] `UpdateForm(ctx, tenantID, formID, input)` — partial update
- [ ] `DeleteForm(ctx, tenantID, formID)` — soft-delete (reject if `is_system`)

**Sections:**
- [ ] `ListSections(ctx, tenantID, formID)` — sections for a form with their fields
- [ ] `GetSection(ctx, tenantID, sectionID)` — single section with fields
- [ ] `CreateSection(ctx, tenantID, input)` — insert section
- [ ] `UpdateSection(ctx, tenantID, sectionID, input)` — partial update
- [ ] `DeleteSection(ctx, tenantID, sectionID)` — soft-delete, set `section_id = NULL` on its fields
- [ ] `ReorderSections(ctx, tenantID, formID, sectionIDs[])` — bulk update display_order

**Fields:**
- [ ] `CreateField(ctx, tenantID, input)` — insert field into section + bulk-insert options
- [ ] `UpdateField(ctx, tenantID, fieldID, input)` — partial update (reject data_type change if values exist)
- [ ] `DeleteField(ctx, tenantID, fieldID)` — soft-delete
- [ ] `MoveFieldToSection(ctx, tenantID, fieldID, sectionID)` — reassign field to different section
- [ ] `ReorderFields(ctx, tenantID, sectionID, fieldIDs[])` — bulk update display_order

**Values & Permissions:**
- [ ] `GetFieldValues(ctx, tenantID, entityType, entityID)` — all field values for an entity
- [ ] `SetFieldValues(ctx, tenantID, inputs[])` — upsert field values
- [ ] `GetFieldPermissions(ctx, tenantID, roleID)` — field permissions for a role
- [ ] `SetFieldPermission(ctx, tenantID, roleID, fieldID, canView, canEdit)` — upsert

#### Service (`service.go`)
- [ ] Validate `module` is a system key OR `cm:<slug>` for an active custom module
- [ ] Validate `data_type` is one of: text, textarea, number, date, select, multiselect, checkbox, email, phone, url, currency, lookup
- [ ] Validate `validation_json` per data_type (lookup requires `lookup_module`)
- [ ] Guard: cannot delete system forms
- [ ] Guard: cannot change `data_type` if field has values
- [ ] Guard: cannot delete options with referencing values
- [ ] Guard: deleting section nullifies `section_id` on fields (does NOT delete fields)
- [ ] Auto-create default "General" section when creating a new form
- [ ] Validate values against field constraints
- [ ] Lookup validation: verify referenced entity exists

### GraphQL schema (`schema/customform.graphqls`)
- [ ] Types: `CustomForm`, `CustomFormSection`, `CustomField`, `CustomFieldOption`, `CustomFieldValue`
- [ ] Input types: `CreateCustomFormInput`, `UpdateCustomFormInput`, `CreateSectionInput`, `UpdateSectionInput`, `CreateCustomFieldInput`, `UpdateCustomFieldInput`, `SetFieldValueInput`, `CustomFieldOptionInput`
- [ ] Queries:
  - [ ] `customForms(module: String): [CustomForm!]!` — `@hasPermission(key: "customfield.write")`
  - [ ] `customForm(id: ID!): CustomForm` — `@hasPermission(key: "customfield.write")`
  - [ ] `customFieldValues(entityType: String!, entityId: ID!): [CustomFieldValue!]!` — `@auth`
- [ ] Mutations — forms:
  - [ ] `createCustomForm(input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `updateCustomForm(id, input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `deleteCustomForm(id)` — `@hasPermission(key: "customfield.write")`
- [ ] Mutations — sections:
  - [ ] `createFormSection(input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `updateFormSection(id, input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `deleteFormSection(id)` — `@hasPermission(key: "customfield.write")`
  - [ ] `reorderFormSections(formId, sectionIds[])` — `@hasPermission(key: "customfield.write")`
- [ ] Mutations — fields:
  - [ ] `createCustomField(input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `updateCustomField(id, input)` — `@hasPermission(key: "customfield.write")`
  - [ ] `deleteCustomField(id)` — `@hasPermission(key: "customfield.write")`
  - [ ] `moveFieldToSection(fieldId, sectionId)` — `@hasPermission(key: "customfield.write")`
  - [ ] `reorderFields(sectionId, fieldIds[])` — `@hasPermission(key: "customfield.write")`
- [ ] Mutations — values:
  - [ ] `setFieldValues(input[])` — `@auth`

### Resolvers + wiring
- [ ] `resolver/customform.resolvers.go` — wire all queries + mutations (including section CRUD)
- [ ] `resolver/resolver.go` — add `CustomFormSvc` field
- [ ] `server/server.go` — construct + inject

### Tests
- [ ] Create form → verify default "General" section auto-created
- [ ] Create section → verify fields can be added to it
- [ ] Delete section → verify fields move to unsectioned (`section_id = NULL`)
- [ ] Reorder sections → verify `display_order` updated
- [ ] Move field between sections → verify `section_id` updated
- [ ] Reorder fields within section → verify `display_order` updated
- [ ] Create custom module → verify slug uniqueness
- [ ] Create form linked to `cm:assets` → verify module validation
- [ ] Lookup field cross-module → verify resolution
- [ ] Guard: reject data_type change when values exist
- [ ] Guard: reject system form deletion
- [ ] Delete custom module → verify cascade soft-delete

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

## Frontend — Custom Forms, Sections & Fields

### Data layer (`lib/custom-forms.ts`)
- [ ] Types: `CustomForm`, `CustomFormSection`, `CustomField`, `CustomFieldOption`, `CustomFieldValue`
- [ ] `useCustomForms(module?)` — list forms with sections → fields
- [ ] `useCustomForm(id)` — single form with sections → fields → options
- [ ] `useCustomFieldValues(entityType, entityId)` — values for an entity
- [ ] `useCreateCustomForm()` — mutation + toast
- [ ] `useUpdateCustomForm()` — mutation + toast
- [ ] `useDeleteCustomForm()` — mutation + toast
- [ ] `useCreateFormSection()` — mutation + toast
- [ ] `useUpdateFormSection()` — mutation + toast
- [ ] `useDeleteFormSection()` — mutation + toast
- [ ] `useReorderFormSections()` — mutation + toast
- [ ] `useCreateCustomField()` — mutation + toast
- [ ] `useUpdateCustomField()` — mutation + toast
- [ ] `useDeleteCustomField()` — mutation + toast
- [ ] `useMoveFieldToSection()` — mutation + toast
- [ ] `useReorderFields()` — mutation + toast
- [ ] `useSetFieldValues()` — mutation + toast

### Settings — form builder

#### Forms list (`/settings/forms`)
- [ ] Add "Custom Forms" tab to settings layout
- [ ] DataTable: Name, Module (badge), Section count, Field count, Status, Actions
- [ ] Filter by module (faceted filter — includes system + custom modules)
- [ ] "New form" button

#### Create form (`/settings/forms/new`)
- [ ] shadcn Form: name, module Select
- [ ] Module Select options: system modules (employee, department, designation, location) + all active custom modules (`cm:<slug>`)
- [ ] Submit → `createCustomForm` (auto-creates default "General" section) → toast → redirect to builder

#### Form builder (`/settings/forms/[id]`)
- [ ] Form header: name, module badge, status, edit/archive buttons
- [ ] **Sections list** — each section as a collapsible Card:
  - [ ] Section header: name, description, drag handle for reorder, collapse toggle
  - [ ] "Edit section" button → section editor dialog
  - [ ] "Delete section" button → confirms, moves fields to unsectioned (does NOT delete fields)
  - [ ] Fields list within section — sortable cards (drag to reorder)
  - [ ] Each field card: key, label, data_type badge, required indicator
  - [ ] "Add field" button per section → field editor dialog (pre-selects section)
  - [ ] Drag field between sections → calls `moveFieldToSection`
- [ ] **"Add section" button** → section editor dialog
- [ ] **Unsectioned fields** — fields with `section_id = NULL` shown in implicit "General" group at top
- [ ] Edit/Delete actions per field

#### Section editor dialog
- [ ] shadcn Form:
  - [ ] Name (required)
  - [ ] Description (optional, Textarea)
  - [ ] Collapsible toggle (Switch, default: true)
  - [ ] Default open toggle (Switch, default: true)

#### Field editor dialog
- [ ] Section Select — which section to place this field in
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
- [ ] Matrix table: rows = fields (grouped by section), columns = roles
- [ ] Each cell: can_view checkbox, can_edit checkbox
- [ ] Save → bulk upsert `field_permissions`
- [ ] Gated by `rbac.manage` + `customfield.write`

### Entity page integration — dynamic custom fields

#### Custom fields tab/section on system entity pages
- [ ] Employee profile (`/employees/[id]`): add "Custom Fields" tab (if forms exist for module=employee)
- [ ] Department (if forms exist for module=department)
- [ ] Designation (if forms exist for module=designation)
- [ ] Location (if forms exist for module=location)

#### Section renderer (`components/custom-fields/section-renderer.tsx`)
- [ ] Renders a form section as a collapsible Card (using shadcn Collapsible)
- [ ] Section header: name + description + collapse toggle
- [ ] Respects `isCollapsible` and `isDefaultOpen` from section config
- [ ] Contains field renderers for all fields in the section

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
- [ ] Accepts form definition (with sections), current values, entity info
- [ ] Renders sections in display_order, fields within each section in display_order
- [ ] Unsectioned fields (`section_id = NULL`) render in implicit group at top
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
