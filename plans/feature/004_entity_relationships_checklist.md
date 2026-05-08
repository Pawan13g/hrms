# Feature 004 — Entity System & Dynamic Relationships Checklist

Derived from `plans/feature/004_entity_relationships_plan.md`. Tick only when
code lands and works.

---

## Prerequisite: Feature 003 (Custom Forms & Modules)

- [x] DB tables: `custom_forms`, `custom_fields`, `custom_field_options`, `custom_field_values`, `field_permissions`
- [ ] DB tables: `custom_modules`, `custom_module_records` (migration 0025)
- [ ] DB tables: `custom_form_sections` + `custom_fields.section_id` (migration 0026)
- [ ] Backend: `internal/modules/customform/` — form, section, field, value CRUD
- [ ] Backend: `internal/modules/custommodule/` — module + record CRUD
- [ ] GraphQL: customform + custommodule schemas + resolvers
- [ ] Frontend: form builder, custom module pages, sidebar integration

---

## Milestone 2: Entity Type Registry

### Migration 0027: `entity_types`
- [ ] `CREATE TABLE entity_types` (id, tenant_id, name, code, is_system, source_table, module_id, icon, display_order, status, created_at, updated_at)
- [ ] `CREATE UNIQUE INDEX entity_types_tenant_code`
- [ ] Seed system types for existing tenants (employee, department, designation, location)
- [ ] Seed entity types for existing `custom_modules`
- [ ] Down migration: `DROP TABLE entity_types`

### Backend: `internal/modules/entityregistry/`

#### Domain types (`types.go`)
- [ ] `EntityType` struct
- [ ] `RelationshipDefinition` struct
- [ ] `EntityRelationship` struct
- [ ] `EntityRef` struct (typeCode, id, displayName, status)
- [ ] Input structs for all create/update operations

#### Repository — Entity Types (`repo.go`)
- [ ] `ListEntityTypes(ctx, tenantID)`
- [ ] `GetEntityType(ctx, tenantID, code)`
- [ ] `GetEntityTypeByID(ctx, tenantID, id)`
- [ ] `CreateEntityType(ctx, tenantID, input)` — validate code format
- [ ] `UpdateEntityType(ctx, tenantID, id, input)`
- [ ] `DeleteEntityType(ctx, tenantID, id)` — reject if `is_system`
- [ ] `SeedSystemTypes(ctx, tenantID)` — insert 4 system types

#### Entity Resolver (`resolver.go`)
- [ ] `ResolveEntity(ctx, tenantID, typeCode, entityID)` — resolve display name
  - [ ] System types: query real table (employees→name, departments→name, etc.)
  - [ ] Custom types (`cm:*`): query `custom_module_records.title`
- [ ] `SearchEntities(ctx, tenantID, typeCode, query, limit)` — for picker UI
  - [ ] System types: search real table by name
  - [ ] Custom types: search `custom_module_records.title`
- [ ] `ResolveEntities(ctx, tenantID, refs)` — batch resolve (group by type)

### Integration hooks
- [ ] `auth/register.go`: call `SeedSystemTypes` after tenant creation
- [ ] `custommodule/service.go`: create `entity_types` row on module creation
- [ ] `custommodule/service.go`: soft-delete `entity_types` row on module deletion

### GraphQL schema (`schema/entityregistry.graphqls`)
- [ ] Types: `EntityType`, `EntityRef`
- [ ] Queries:
  - [ ] `entityTypes: [EntityType!]!` — `@auth`
  - [ ] `entityType(code: String!): EntityType` — `@auth`
  - [ ] `searchEntities(typeCode: String!, query: String!, limit: Int): [EntityRef!]!` — `@auth`

### Resolvers + wiring
- [ ] `resolver/entityregistry.resolvers.go` — entity type queries
- [ ] `resolver/resolver.go` — add `EntityRegistrySvc` field
- [ ] `server/server.go` — construct + inject

### Frontend
- [ ] Types in `lib/entity-registry.ts`: `EntityType`, `EntityRef`
- [ ] `useEntityTypes()` query hook
- [ ] `useEntityType(code)` query hook
- [ ] `useSearchEntities(typeCode, query)` query hook
- [ ] `/settings/entity-types` page — read-only DataTable
- [ ] Upgrade lookup field target module selector to use `entityTypes` query

---

## Milestone 3: Relationship Definitions

### Migration 0028: `relationship_definitions`
- [ ] `CREATE TABLE relationship_definitions` (id, tenant_id, from_entity_type_id, to_entity_type_id, relationship_name, inverse_name, cardinality, is_system, description, status, created_at, updated_at)
- [ ] `CREATE UNIQUE INDEX rel_def_tenant_from_to_name`
- [ ] Seed system relationship definitions for existing tenants
- [ ] Down migration: `DROP TABLE relationship_definitions`

### Backend: Repository — Relationship Definitions
- [ ] `ListRelationshipDefs(ctx, tenantID)` — all with resolved entity type names
- [ ] `ListRelationshipDefsForType(ctx, tenantID, entityTypeCode)` — filtered
- [ ] `GetRelationshipDef(ctx, tenantID, id)`
- [ ] `CreateRelationshipDef(ctx, tenantID, input)` — validate entity types exist
- [ ] `UpdateRelationshipDef(ctx, tenantID, id, input)` — reject if `is_system`
- [ ] `DeleteRelationshipDef(ctx, tenantID, id)` — reject if `is_system`, cascade

### Backend: Service validations
- [ ] Validate cardinality is one of: `one_to_one`, `one_to_many`, `many_to_many`
- [ ] Validate `from_entity_type_id` and `to_entity_type_id` are active types
- [ ] Guard: cannot modify/delete system definitions
- [ ] Guard: deleting a definition cascades soft-delete to `entity_relationships`
- [ ] Seed system relationship definitions on tenant registration

### GraphQL
- [ ] Type: `RelationshipDefinition` (with `fromEntityType`, `toEntityType` resolved, `relationshipCount`)
- [ ] Input: `CreateRelationshipDefInput`, `UpdateRelationshipDefInput`
- [ ] Query: `relationshipDefinitions(entityTypeCode: String): [RelationshipDefinition!]!` — `@auth`
- [ ] Mutation: `createRelationshipDef` — `@hasPermission(key: "customfield.write")`
- [ ] Mutation: `updateRelationshipDef` — `@hasPermission(key: "customfield.write")`
- [ ] Mutation: `deleteRelationshipDef` — `@hasPermission(key: "customfield.write")`

### Resolvers + wiring
- [ ] Add relationship definition resolvers to `entityregistry.resolvers.go`

### Frontend
- [ ] Types in `lib/entity-registry.ts`: `RelationshipDefinition`
- [ ] `useRelationshipDefs(entityTypeCode?)` query hook
- [ ] `useCreateRelationshipDef()` mutation + toast
- [ ] `useUpdateRelationshipDef()` mutation + toast
- [ ] `useDeleteRelationshipDef()` mutation + toast
- [ ] `/settings/relationships` page:
  - [ ] DataTable: From Type, To Type, Name, Inverse Name, Cardinality, System badge
  - [ ] Filter by entity type
  - [ ] "New relationship definition" button
  - [ ] Create/edit dialog (shadcn Form)
  - [ ] Delete action (blocked for system definitions)

---

## Milestone 4: Entity Relationships (Runtime Data)

### Migration 0029: `entity_relationships`
- [ ] `CREATE TABLE entity_relationships` (id, tenant_id, definition_id, from_entity_type_code, to_entity_type_code, from_entity_id, to_entity_id, metadata_json, status, created_at, created_by)
- [ ] `CREATE INDEX entity_rel_from`
- [ ] `CREATE INDEX entity_rel_to`
- [ ] `CREATE UNIQUE INDEX entity_rel_unique` (partial, WHERE status = 'active')
- [ ] Down migration: `DROP TABLE entity_relationships`

### Backend: Repository — Entity Relationships
- [ ] `ListRelationships(ctx, tenantID, typeCode, entityID)` — both directions, with resolved display names
- [ ] `ListRelationshipsByDef(ctx, tenantID, defID, search?)` — all for a definition
- [ ] `CreateRelationship(ctx, tenantID, input)` — insert with cardinality check
- [ ] `DeleteRelationship(ctx, tenantID, id)` — soft-delete

### Backend: Service validations
- [ ] Validate definition exists and is active
- [ ] Validate from/to entities exist (via entity resolver)
- [ ] Cardinality enforcement:
  - [ ] `one_to_one`: reject if either side has an existing active relationship for this definition
  - [ ] `one_to_many`: reject if `to_entity_id` already has an active relationship for this definition
  - [ ] `many_to_many`: no constraint
- [ ] Audit logging for create/delete

### GraphQL
- [ ] Type: `EntityRelationship` (with `definition`, `fromEntityDisplay`, `toEntityDisplay` resolved)
- [ ] Input: `CreateEntityRelationshipInput`
- [ ] Query: `entityRelationships(entityTypeCode: String!, entityId: ID!): [EntityRelationship!]!` — `@auth`
- [ ] Mutation: `createEntityRelationship` — `@auth`
- [ ] Mutation: `deleteEntityRelationship` — `@auth`

### Resolvers + wiring
- [ ] Add relationship resolvers to `entityregistry.resolvers.go`

### Frontend: Relationships Panel Component
- [ ] `components/entity-registry/relationships-panel.tsx`:
  - [ ] Props: `entityTypeCode`, `entityId`
  - [ ] Groups relationships by definition (section per relationship type)
  - [ ] Shows resolved display names
  - [ ] "Remove" button per relationship
  - [ ] "Add" button per relationship type → opens picker dialog
- [ ] `components/entity-registry/add-relationship-dialog.tsx`:
  - [ ] Select relationship definition (filtered to available defs for this entity type)
  - [ ] Searchable entity picker (uses `searchEntities` query)
  - [ ] Submit → `createEntityRelationship` + toast

### Frontend: Page Integration
- [ ] Employee detail (`/employees/[id]`) — add Relationships tab/section (custom relationships only)
- [ ] Custom module record (`/modules/[slug]/[id]`) — add Relationships section
- [ ] Department/designation/location detail pages (if they exist) — add Relationships section

---

## Cross-cutting

- [ ] All forms use shadcn Form
- [ ] All tables use generic DataTable
- [ ] All mutations use Sonner toasts
- [ ] All pages use CSS variables (no hardcoded colors)
- [ ] Dark mode support
- [ ] Soft-delete uses "Archive" language
- [ ] Settings pages gated by `customfield.write` permission
- [ ] Entity relationships respect tenant isolation
- [ ] System types and definitions shown but not editable
- [ ] Audit logs for all entity registry mutations

---

## Milestone 5: Polish (post-launch)

- [ ] Batch entity resolution (dataloader pattern)
- [ ] Redis caching for entity display names
- [ ] Relationship metadata editing (dates, notes)
- [ ] Relationship-based DataTable filters
- [ ] CSV export of relationships
- [ ] Graph visualization (optional)

---

## Out of scope

- Relationship-based workflow triggers
- Relationship versioning / history
- Relationship-level permissions
- Graph queries (multi-hop traversal)
- Computed fields based on relationships
- Bi-directional sync between system FKs and entity_relationships
