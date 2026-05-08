# Feature 004 — Metadata-Driven Entity System & Dynamic Relationships

## Summary

Extend the existing custom forms/modules system (Feature 003) with a **unified
entity type registry** and a **dynamic relationship engine**. This moves the
HRMS from Level 1 (hardcoded tables) toward Level 3 (metadata-driven entities)
where adding a new organizational concept — cost centers, brands, business
units, territories — requires zero schema migrations. Relationships between
any entities (system or custom) are configured at runtime by tenant admins.

---

## Current State & What Already Exists

### Fixed schema tables (migrations 0001-0024)

| Table | Type | Status |
|-------|------|--------|
| `tenants` | System | Done |
| `users`, `roles`, `permissions`, `role_permissions`, `user_roles` | System | Done |
| `departments`, `designations`, `locations` | System (org masters) | Done |
| `employees` | System (core) | Done |
| `countries`, `states`, `cities` | System (geography) | Done |
| `audit_logs` | System | Done |

### Custom forms tables (migrations 0014-0018)

| Table | Status |
|-------|--------|
| `custom_forms` | Done |
| `custom_fields` | Done |
| `custom_field_options` | Done |
| `custom_field_values` | Done |
| `field_permissions` | Done |

### Feature 003 (planned, not yet built)

| Component | Status |
|-----------|--------|
| `custom_modules` table | Planned (migration 0025) |
| `custom_module_records` table | Planned (migration 0025) |
| `custom_form_sections` table | Planned (migration 0026) |
| Backend Go modules (customform, custommodule) | Planned |
| GraphQL schema + resolvers | Planned |
| Frontend (form builder, module CRUD, dynamic pages) | Planned |

### What's missing (this plan adds)

1. **`entity_types`** — unified registry of all entity types (system + custom)
2. **`relationship_definitions`** — allowed relationship schemas between entity types
3. **`entity_relationships`** — actual relationship instances between entity records
4. Backend module for entity types + relationships
5. GraphQL API for relationship CRUD
6. Frontend UI for configuring & viewing relationships

---

## Architecture

### Design Philosophy: Hybrid Approach

Keep **stable entities as real tables** (employees, users, payroll, attendance)
for performance, joins, and reporting. Use the **metadata system for
configurable masters** (departments, cost centers, brands, business units,
custom org structures).

The bridge between these worlds is the **entity type registry** — a single
table that knows about both system tables and custom modules, giving the
relationship engine a unified namespace.

### How It Fits Together

```
┌─────────────────────────────────────────────────────────┐
│                   Entity Type Registry                   │
│  (system: employee, department, location, designation)   │
│  (custom: cost_center, brand, territory, assets, etc.)   │
└────────────┬──────────────────────────────┬──────────────┘
             │                              │
    ┌────────▼────────┐          ┌──────────▼──────────┐
    │  Real Tables     │          │  custom_module_      │
    │  (employees,     │          │  records + custom_   │
    │   departments,   │          │  field_values        │
    │   locations)     │          │  (EAV storage)       │
    └────────┬────────┘          └──────────┬──────────┘
             │                              │
             └──────────┬───────────────────┘
                        │
              ┌─────────▼─────────┐
              │ entity_            │
              │ relationships      │
              │ (any ↔ any)        │
              └───────────────────┘
```

---

## Phase 1: Entity Type Registry

### New table: `entity_types`

```sql
CREATE TABLE entity_types (
    id            BIGSERIAL    PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,        -- "Department", "Cost Center"
    code          VARCHAR(64)  NOT NULL,        -- "department", "cost_center"
    is_system     BOOLEAN      NOT NULL DEFAULT FALSE,
    source_table  VARCHAR(128),                 -- "departments" for system, NULL for custom
    module_id     BIGINT       REFERENCES custom_modules(id) ON DELETE SET NULL,
    icon          VARCHAR(64),                  -- lucide icon name
    display_order INTEGER      NOT NULL DEFAULT 0,
    status        VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX entity_types_tenant_code ON entity_types(tenant_id, code);
```

**Key design decisions:**

- `is_system = true` for entities backed by real tables (employee, department,
  designation, location). These rows are **auto-seeded** during tenant creation
  and cannot be deleted.
- `source_table` tells the system where to find records for system types
  (e.g. `"departments"` → query `departments` table).
- `module_id` links to `custom_modules` for custom types. When a custom module
  is created, an `entity_types` row is also created.
- `code` is the universal identifier used in relationships, form bindings, and
  `custom_field_values.entity_type`.

### Seed data (per tenant, created on registration)

| code | name | is_system | source_table |
|------|------|-----------|--------------|
| `employee` | Employee | true | `employees` |
| `department` | Department | true | `departments` |
| `designation` | Designation | true | `designations` |
| `location` | Location | true | `locations` |

### Integration with Feature 003

When a tenant admin creates a custom module (e.g. slug="assets"):
1. Insert into `custom_modules` (Feature 003 behavior)
2. **Also insert into `entity_types`** with `code = "cm:assets"`, `is_system = false`, `module_id = <new module id>`

This keeps `entity_types` as the single source of truth for "what entity types
exist in this tenant."

---

## Phase 2: Relationship Definitions

### New table: `relationship_definitions`

Defines what relationships are **allowed** between entity types. This is the
schema layer — admins configure which entity types can be linked and how.

```sql
CREATE TABLE relationship_definitions (
    id                    BIGSERIAL    PRIMARY KEY,
    tenant_id             BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_entity_type_id   BIGINT       NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    to_entity_type_id     BIGINT       NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    relationship_name     VARCHAR(128) NOT NULL,   -- "belongs_to", "assigned_to", "managed_by"
    inverse_name          VARCHAR(128),            -- "has_departments" (shown on the other side)
    cardinality           VARCHAR(16)  NOT NULL DEFAULT 'many_to_many',
                                                   -- "one_to_one", "one_to_many", "many_to_many"
    is_system             BOOLEAN      NOT NULL DEFAULT FALSE,
    description           TEXT,
    status                VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX rel_def_tenant_from_to_name
    ON relationship_definitions(tenant_id, from_entity_type_id, to_entity_type_id, relationship_name);
```

**Cardinality enforcement:**
- `one_to_one`: max 1 relationship per entity on both sides
- `one_to_many`: from-entity can have many, to-entity can have only 1
- `many_to_many`: no cardinality constraints

### Seed data (system relationships, per tenant)

| from | to | relationship_name | inverse_name | cardinality | is_system |
|------|----|-------------------|-------------|-------------|-----------|
| employee | department | belongs_to | has_employees | many_to_one | true |
| employee | designation | holds | held_by | many_to_one | true |
| employee | location | works_at | has_workers | many_to_one | true |
| employee | employee | reports_to | manages | many_to_one | true |
| designation | department | under | has_designations | many_to_one | true |
| location | location | parent_of | child_of | one_to_many | true |
| department | department | parent_of | child_of | one_to_many | true |

**Note:** System relationships mirror the existing FK relationships in the
fixed tables. They exist in the registry so the UI can display them
consistently, but the actual data still lives in the FK columns
(`employees.department_id`, etc.). For system relationships, the relationship
engine reads from the FK columns rather than `entity_relationships`.

---

## Phase 3: Entity Relationships (Runtime Data)

### New table: `entity_relationships`

Stores actual relationship instances between entity records.

```sql
CREATE TABLE entity_relationships (
    id                      BIGSERIAL    PRIMARY KEY,
    tenant_id               BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    definition_id           BIGINT       NOT NULL REFERENCES relationship_definitions(id) ON DELETE CASCADE,
    from_entity_type_code   VARCHAR(64)  NOT NULL,  -- denormalized for fast queries
    from_entity_id          BIGINT       NOT NULL,
    to_entity_type_code     VARCHAR(64)  NOT NULL,   -- denormalized for fast queries
    to_entity_id            BIGINT       NOT NULL,
    metadata_json           JSONB,                   -- optional: extra data on the relationship
    status                  VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT       REFERENCES users(id)
);

CREATE INDEX entity_rel_from ON entity_relationships(tenant_id, from_entity_type_code, from_entity_id);
CREATE INDEX entity_rel_to   ON entity_relationships(tenant_id, to_entity_type_code, to_entity_id);
CREATE UNIQUE INDEX entity_rel_unique
    ON entity_relationships(tenant_id, definition_id, from_entity_id, to_entity_id)
    WHERE status = 'active';
```

**Key design decisions:**

- `from_entity_type_code` / `to_entity_type_code` are **denormalized** from
  the definition for query performance (avoids joining through
  `relationship_definitions` → `entity_types` on every lookup).
- `metadata_json` allows storing relationship-specific data (e.g. "effective_date",
  "assignment_type", "notes").
- The unique partial index prevents duplicate active relationships.
- **System entity relationships** (employee→department, etc.) are NOT stored
  here — they use the existing FK columns. Only custom-to-custom and
  custom-to-system relationships use this table.

### When `entity_relationships` is used vs FKs

| Relationship | Storage | Why |
|-------------|---------|-----|
| employee → department | `employees.department_id` FK | System, performance-critical, used in queries/reports |
| employee → designation | `employees.designation_id` FK | System |
| employee → manager | `employees.manager_id` FK | System |
| location → cost_center | `entity_relationships` | Custom entity on one side |
| department → brand | `entity_relationships` | Custom entity on one side |
| cost_center → territory | `entity_relationships` | Both sides are custom |
| employee → assets (custom) | `entity_relationships` | Custom entity on one side |

---

## Phase 4: Resolving Entities Generically

### Entity Resolver Service

A new service that can resolve any entity by type code + ID, regardless of
whether it's a system table or custom module record.

```go
// internal/modules/entityregistry/resolver.go

type EntityRef struct {
    TypeCode    string   // "employee", "department", "cm:assets"
    ID          int64
    DisplayName string   // resolved name/title for display
    Status      string
}

type Resolver interface {
    // Resolve a single entity reference to its display name
    ResolveEntity(ctx context.Context, tenantID int64, typeCode string, entityID int64) (*EntityRef, error)

    // Search entities of a given type (for relationship picker UI)
    SearchEntities(ctx context.Context, tenantID int64, typeCode string, query string, limit int) ([]*EntityRef, error)
}
```

**Resolution strategy by type:**

| Type Code | Resolution |
|-----------|-----------|
| `employee` | Query `employees` table → `first_name + last_name` |
| `department` | Query `departments` table → `name` |
| `designation` | Query `designations` table → `title` |
| `location` | Query `locations` table → `name` |
| `cm:*` | Query `custom_module_records` table → `title` |

This resolver is used by:
1. The relationship API (to show display names in relationship lists)
2. Lookup fields in custom forms (Feature 003)
3. The relationship picker UI

---

## Database Migrations Plan

### Migration 0025: `custom_modules` (from Feature 003)
Already planned in 003 checklist. No changes needed.

### Migration 0026: `custom_form_sections` (from Feature 003)
Already planned in 003 checklist. No changes needed.

### Migration 0027: `entity_types`

```sql
-- 0027_entity_types.up.sql
CREATE TABLE entity_types (
    id            BIGSERIAL    PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    code          VARCHAR(64)  NOT NULL,
    is_system     BOOLEAN      NOT NULL DEFAULT FALSE,
    source_table  VARCHAR(128),
    module_id     BIGINT       REFERENCES custom_modules(id) ON DELETE SET NULL,
    icon          VARCHAR(64),
    display_order INTEGER      NOT NULL DEFAULT 0,
    status        VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX entity_types_tenant_code ON entity_types(tenant_id, code);

-- Seed system entity types for all existing tenants
INSERT INTO entity_types (tenant_id, name, code, is_system, source_table, icon, display_order)
SELECT id, 'Employee', 'employee', true, 'employees', 'users', 1 FROM tenants
UNION ALL
SELECT id, 'Department', 'department', true, 'departments', 'building-2', 2 FROM tenants
UNION ALL
SELECT id, 'Designation', 'designation', true, 'designations', 'badge', 3 FROM tenants
UNION ALL
SELECT id, 'Location', 'location', true, 'locations', 'map-pin', 4 FROM tenants;

-- Also seed for any existing custom_modules
INSERT INTO entity_types (tenant_id, name, code, is_system, source_table, module_id, icon, display_order)
SELECT tenant_id, name, 'cm:' || slug, false, NULL, id, icon, display_order + 100
FROM custom_modules WHERE status = 'active';
```

### Migration 0028: `relationship_definitions`

```sql
-- 0028_relationship_definitions.up.sql
CREATE TABLE relationship_definitions (
    id                    BIGSERIAL    PRIMARY KEY,
    tenant_id             BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_entity_type_id   BIGINT       NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    to_entity_type_id     BIGINT       NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    relationship_name     VARCHAR(128) NOT NULL,
    inverse_name          VARCHAR(128),
    cardinality           VARCHAR(16)  NOT NULL DEFAULT 'many_to_many',
    is_system             BOOLEAN      NOT NULL DEFAULT FALSE,
    description           TEXT,
    status                VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX rel_def_tenant_from_to_name
    ON relationship_definitions(tenant_id, from_entity_type_id, to_entity_type_id, relationship_name);

-- Seed system relationships for existing tenants
-- (uses subqueries to resolve entity_type IDs)
INSERT INTO relationship_definitions
    (tenant_id, from_entity_type_id, to_entity_type_id, relationship_name, inverse_name, cardinality, is_system)
SELECT
    t.id,
    ef.id,
    et.id,
    rel.rel_name,
    rel.inv_name,
    rel.card,
    true
FROM tenants t
CROSS JOIN (VALUES
    ('employee',    'department',  'belongs_to',  'has_employees',    'many_to_one'),
    ('employee',    'designation', 'holds',       'held_by',          'many_to_one'),
    ('employee',    'location',    'works_at',    'has_workers',      'many_to_one'),
    ('employee',    'employee',    'reports_to',  'manages',          'many_to_one'),
    ('department',  'department',  'parent_of',   'child_of',         'one_to_many'),
    ('designation', 'department',  'under',       'has_designations', 'many_to_one')
) AS rel(from_code, to_code, rel_name, inv_name, card)
JOIN entity_types ef ON ef.tenant_id = t.id AND ef.code = rel.from_code
JOIN entity_types et ON et.tenant_id = t.id AND et.code = rel.to_code;
```

### Migration 0029: `entity_relationships`

```sql
-- 0029_entity_relationships.up.sql
CREATE TABLE entity_relationships (
    id                      BIGSERIAL    PRIMARY KEY,
    tenant_id               BIGINT       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    definition_id           BIGINT       NOT NULL REFERENCES relationship_definitions(id) ON DELETE CASCADE,
    from_entity_type_code   VARCHAR(64)  NOT NULL,
    from_entity_id          BIGINT       NOT NULL,
    to_entity_type_code     VARCHAR(64)  NOT NULL,
    to_entity_id            BIGINT       NOT NULL,
    metadata_json           JSONB,
    status                  VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT       REFERENCES users(id)
);

CREATE INDEX entity_rel_from ON entity_relationships(tenant_id, from_entity_type_code, from_entity_id);
CREATE INDEX entity_rel_to   ON entity_relationships(tenant_id, to_entity_type_code, to_entity_id);
CREATE UNIQUE INDEX entity_rel_unique
    ON entity_relationships(tenant_id, definition_id, from_entity_id, to_entity_id)
    WHERE status = 'active';
```

---

## Backend Implementation

### New module: `internal/modules/entityregistry/`

#### Domain types (`types.go`)

```go
type EntityType struct {
    ID           int64
    TenantID     int64
    Name         string
    Code         string
    IsSystem     bool
    SourceTable  *string
    ModuleID     *int64
    Icon         *string
    DisplayOrder int
    Status       string
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

type RelationshipDefinition struct {
    ID               int64
    TenantID         int64
    FromEntityTypeID int64
    ToEntityTypeID   int64
    FromEntityType   *EntityType  // resolved
    ToEntityType     *EntityType  // resolved
    RelationshipName string
    InverseName      *string
    Cardinality      string       // "one_to_one", "one_to_many", "many_to_many"
    IsSystem         bool
    Description      *string
    Status           string
    CreatedAt        time.Time
}

type EntityRelationship struct {
    ID                 int64
    TenantID           int64
    DefinitionID       int64
    Definition         *RelationshipDefinition // resolved
    FromEntityTypeCode string
    FromEntityID       int64
    FromEntity         *EntityRef              // resolved display name
    ToEntityTypeCode   string
    ToEntityID         int64
    ToEntity           *EntityRef              // resolved display name
    MetadataJSON       *map[string]any
    Status             string
    CreatedAt          time.Time
    CreatedBy          *int64
}

type EntityRef struct {
    TypeCode    string
    ID          int64
    DisplayName string
    Status      string
}
```

#### Repository (`repo.go`)

**Entity Types:**
- `ListEntityTypes(ctx, tenantID)` — all entity types for a tenant
- `GetEntityType(ctx, tenantID, code)` — single by code
- `GetEntityTypeByID(ctx, tenantID, id)` — single by ID
- `CreateEntityType(ctx, tenantID, input)` — insert (called when custom module created)
- `UpdateEntityType(ctx, tenantID, id, input)` — partial update
- `DeleteEntityType(ctx, tenantID, id)` — soft-delete (reject if `is_system`)
- `SeedSystemTypes(ctx, tenantID)` — called during tenant registration

**Relationship Definitions:**
- `ListRelationshipDefs(ctx, tenantID)` — all definitions with resolved entity type names
- `ListRelationshipDefsForType(ctx, tenantID, entityTypeCode)` — definitions involving a specific type
- `GetRelationshipDef(ctx, tenantID, id)` — single definition
- `CreateRelationshipDef(ctx, tenantID, input)` — insert (validate entity types exist)
- `UpdateRelationshipDef(ctx, tenantID, id, input)` — partial update (reject if `is_system`)
- `DeleteRelationshipDef(ctx, tenantID, id)` — soft-delete (reject if `is_system`, cascade soft-delete relationships)

**Entity Relationships:**
- `ListRelationships(ctx, tenantID, entityTypeCode, entityID)` — all relationships for an entity (both directions)
- `ListRelationshipsByDef(ctx, tenantID, defID, search?)` — all relationships for a definition
- `CreateRelationship(ctx, tenantID, input)` — insert (validate cardinality)
- `DeleteRelationship(ctx, tenantID, id)` — soft-delete

**Entity Resolver:**
- `ResolveEntity(ctx, tenantID, typeCode, entityID)` — resolve display name
- `SearchEntities(ctx, tenantID, typeCode, query, limit)` — search for picker UI
- `ResolveEntities(ctx, tenantID, refs []EntityRef)` — batch resolve (N+1 prevention)

#### Service (`service.go`)

- Validate entity type `code` format (lowercase, a-z0-9, underscores/hyphens)
- Validate `code` doesn't collide with system types
- Validate `cardinality` is one of: `one_to_one`, `one_to_many`, `many_to_many`
- **Cardinality enforcement** on relationship creation:
  - `one_to_one`: check both sides have no existing active relationship for this definition
  - `one_to_many` (from=one, to=many): check `to_entity_id` has no existing active relationship
  - `many_to_many`: no constraint
- Guard: cannot delete system entity types
- Guard: cannot delete system relationship definitions
- Guard: deleting a relationship definition cascades soft-delete to relationships
- Guard: deleting an entity type cascades soft-delete to its relationship definitions
- Auto-create `entity_types` row when a custom module is created (hook into custommodule service)
- Auto-seed system entity types + system relationship definitions on tenant registration

### Integration with existing modules

#### `internal/auth/register.go` — Tenant registration

After creating the tenant, call `entityRegistrySvc.SeedSystemTypes(ctx, tenantID)`
to create the 4 system entity type rows and the system relationship definitions.

#### `internal/modules/custommodule/service.go` — Custom module CRUD

- **CreateModule**: after inserting `custom_modules`, also insert into `entity_types`
  with `code = "cm:" + slug`, `module_id = newModule.ID`
- **DeleteModule**: also soft-delete the corresponding `entity_types` row + cascade

#### `internal/modules/customform/service.go` — Form module validation

Replace the hardcoded system module list with a query to `entity_types`:
- `ValidateModule(module string)` → check `entity_types` where `code = module`

### GraphQL Schema (`schema/entityregistry.graphqls`)

```graphql
type EntityType {
  id: ID!
  name: String!
  code: String!
  isSystem: Boolean!
  sourceTable: String
  moduleId: ID
  icon: String
  displayOrder: Int!
  status: String!
  relationshipDefinitions: [RelationshipDefinition!]!
}

type RelationshipDefinition {
  id: ID!
  fromEntityType: EntityType!
  toEntityType: EntityType!
  relationshipName: String!
  inverseName: String
  cardinality: String!
  isSystem: Boolean!
  description: String
  status: String!
  relationshipCount: Int!
}

type EntityRelationship {
  id: ID!
  definition: RelationshipDefinition!
  fromEntityTypeCode: String!
  fromEntityId: ID!
  fromEntityDisplay: String!
  toEntityTypeCode: String!
  toEntityId: ID!
  toEntityDisplay: String!
  metadataJson: JSON
  status: String!
  createdAt: Int!
}

type EntityRef {
  typeCode: String!
  id: ID!
  displayName: String!
  status: String!
}

# --- Inputs ---

input CreateRelationshipDefInput {
  fromEntityTypeId: ID!
  toEntityTypeId: ID!
  relationshipName: String!
  inverseName: String
  cardinality: String!
  description: String
}

input UpdateRelationshipDefInput {
  relationshipName: String
  inverseName: String
  description: String
  status: String
}

input CreateEntityRelationshipInput {
  definitionId: ID!
  fromEntityId: ID!
  toEntityId: ID!
  metadataJson: JSON
}

# --- Queries ---

extend type Query {
  entityTypes: [EntityType!]!                                          @auth
  entityType(code: String!): EntityType                                @auth
  relationshipDefinitions(entityTypeCode: String): [RelationshipDefinition!]!  @auth
  entityRelationships(entityTypeCode: String!, entityId: ID!): [EntityRelationship!]!  @auth
  searchEntities(typeCode: String!, query: String!, limit: Int): [EntityRef!]!  @auth
}

# --- Mutations ---

extend type Mutation {
  createRelationshipDef(input: CreateRelationshipDefInput!): RelationshipDefinition!
      @hasPermission(key: "customfield.write")
  updateRelationshipDef(id: ID!, input: UpdateRelationshipDefInput!): RelationshipDefinition!
      @hasPermission(key: "customfield.write")
  deleteRelationshipDef(id: ID!): Boolean!
      @hasPermission(key: "customfield.write")

  createEntityRelationship(input: CreateEntityRelationshipInput!): EntityRelationship!  @auth
  deleteEntityRelationship(id: ID!): Boolean!                                            @auth
}
```

### RBAC Permissions

Add new permission keys in `rbac/registry.go`:

| Key | Description |
|-----|-------------|
| `entitytype.read` | View entity types |
| `entitytype.write` | Create/edit entity types (admin) |
| `relationship.read` | View relationships |
| `relationship.write` | Create/delete relationships |
| `relationshipdef.write` | Configure relationship definitions (admin) |

Or reuse `customfield.write` for all admin config (simpler, fewer permissions
to manage). Recommended: reuse `customfield.write` initially, split later if
needed.

### Audit Logging

All mutations on `entity_types`, `relationship_definitions`, and
`entity_relationships` should call `audit.Record()` with:
- `entity_type` = "entity_type" / "relationship_definition" / "entity_relationship"
- `entity_id` = the record ID
- `action` = "created" / "updated" / "deleted"
- `old_data` / `new_data` = JSON snapshots

---

## Frontend Implementation

### Data layer (`lib/entity-registry.ts`)

**Types:**
- `EntityType`, `RelationshipDefinition`, `EntityRelationship`, `EntityRef`

**Query hooks:**
- `useEntityTypes()` — all entity types
- `useEntityType(code)` — single
- `useRelationshipDefs(entityTypeCode?)` — definitions, optionally filtered
- `useEntityRelationships(typeCode, entityId)` — relationships for an entity
- `useSearchEntities(typeCode, query)` — for relationship picker

**Mutation hooks:**
- `useCreateRelationshipDef()` + toast
- `useUpdateRelationshipDef()` + toast
- `useDeleteRelationshipDef()` + toast
- `useCreateEntityRelationship()` + toast
- `useDeleteEntityRelationship()` + toast

### Settings — Relationship Configuration

#### Entity types list (`/settings/entity-types`)

- Add "Entity Types" tab to settings layout
- DataTable: Name, Code, System/Custom badge, Source, Record count, Status
- System types shown but not editable/deletable
- Link to relationship definitions per type

#### Relationship definitions (`/settings/relationships`)

- DataTable: From Type, To Type, Relationship Name, Inverse Name, Cardinality, System badge
- "New relationship" button (admin only)
- Filter by entity type

#### Create/edit relationship definition dialog

- shadcn Form:
  - From Entity Type (Select from `entityTypes`)
  - To Entity Type (Select from `entityTypes`)
  - Relationship Name (text, e.g. "belongs_to")
  - Inverse Name (text, e.g. "has_departments")
  - Cardinality (Select: one_to_one, one_to_many, many_to_many)
  - Description (optional)

### Entity Page Integration — Relationships Panel

#### Relationships tab/section on entity pages

On every entity detail page (employee, department, location, custom module
record), add a **"Relationships" section** that shows all relationships for
that entity.

**Component: `components/entity-registry/relationships-panel.tsx`**

```
┌─ Relationships ────────────────────────────────────┐
│                                                     │
│  belongs_to → Department                            │
│  ┌─────────────────────────────────────────────┐   │
│  │  HR Department                    [Remove]   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  assigned_to → Cost Center                          │
│  ┌─────────────────────────────────────────────┐   │
│  │  CC-1001 (North Region)           [Remove]   │   │
│  │  CC-2002 (South Region)           [Remove]   │   │
│  └─────────────────────────────────────────────┘   │
│                                      [+ Add]        │
│                                                     │
│  manages → Assets                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │  MacBook Pro #1234                [Remove]   │   │
│  │  iPhone 15 #5678                  [Remove]   │   │
│  └─────────────────────────────────────────────┘   │
│                                      [+ Add]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**"Add relationship" dialog:**
- Shows available relationship definitions for this entity type
- User picks the definition → searchable Select to find the target entity
- Submit → `createEntityRelationship`

#### Integration points

| Page | What to add |
|------|------------|
| `/employees/[id]` | Relationships tab (shows custom relationships, NOT the system FK ones which are already displayed) |
| `/departments/[id]` (if exists) | Relationships section |
| `/locations/[id]` (if exists) | Relationships section |
| `/modules/[slug]/[id]` | Relationships section (custom module record) |

**Important:** For system entities, the relationships panel should only show
**non-system** relationship definitions (the custom ones admins configured).
System relationships (employee→department) are already displayed via the
existing FK-based UI.

### Sidebar & Navigation

No sidebar changes needed beyond Feature 003's custom module nav items.
Entity types and relationship config live under Settings.

### Lookup Field Integration (Feature 003 upgrade)

Replace the hardcoded module list in the lookup field's target module selector
with a query to `entityTypes`:

```tsx
// Before (Feature 003)
const modules = ["employee", "department", "designation", "location", ...customModules]

// After (Feature 004)
const { data: entityTypes } = useEntityTypes()
const modules = entityTypes.map(et => ({ value: et.code, label: et.name }))
```

The `searchEntities` query from the entity resolver replaces the per-module
search queries in the lookup field component.

---

## Implementation Order (Phased Milestones)

### Milestone 1: Feature 003 — Custom Forms & Modules (prerequisite)

Complete the existing 003 plan first. This gives us:
- [x] `custom_forms`, `custom_fields`, `custom_field_options`, `custom_field_values`, `field_permissions` tables
- [ ] `custom_modules` + `custom_module_records` tables
- [ ] `custom_form_sections` table
- [ ] Backend: customform + custommodule Go modules
- [ ] GraphQL: form builder + module CRUD APIs
- [ ] Frontend: form builder UI + custom module pages + sidebar integration

### Milestone 2: Entity Type Registry (this plan, Phase 1)

- [ ] Migration 0027: `entity_types` table + seed data
- [ ] Backend: `entityregistry` module — entity type CRUD + resolver
- [ ] Hook: auto-create entity type when custom module created
- [ ] Hook: seed system types on tenant registration
- [ ] GraphQL: `entityTypes`, `entityType(code)`, `searchEntities` queries
- [ ] Frontend: `/settings/entity-types` page (read-only list for now)
- [ ] Frontend: `useEntityTypes()`, `useSearchEntities()` hooks
- [ ] Upgrade Feature 003 lookup fields to use entity type registry

### Milestone 3: Relationship Definitions (this plan, Phase 2)

- [ ] Migration 0028: `relationship_definitions` table + seed data
- [ ] Backend: relationship definition CRUD in `entityregistry` module
- [ ] GraphQL: `relationshipDefinitions` query + definition mutations
- [ ] Frontend: `/settings/relationships` page — DataTable + create/edit dialog
- [ ] Frontend: `useRelationshipDefs()` + mutation hooks

### Milestone 4: Entity Relationships (this plan, Phase 3)

- [ ] Migration 0029: `entity_relationships` table
- [ ] Backend: entity relationship CRUD + cardinality enforcement
- [ ] Backend: entity resolver — resolve display names for relationship endpoints
- [ ] GraphQL: `entityRelationships` query + relationship mutations
- [ ] Frontend: `relationships-panel.tsx` component
- [ ] Frontend: "Add relationship" dialog with entity search
- [ ] Integrate relationships panel into employee detail page
- [ ] Integrate relationships panel into custom module record pages
- [ ] Audit logging for all relationship mutations

### Milestone 5: Polish & Advanced Features

- [ ] Batch entity resolution (dataloader pattern for N+1 prevention)
- [ ] Relationship metadata editing (dates, notes on relationships)
- [ ] Relationship graph visualization (optional, nice-to-have)
- [ ] Export relationships to CSV
- [ ] Relationship-based filters in DataTable (e.g. "employees in cost center X")

---

## Performance Considerations

1. **Entity resolver caching**: System entities (departments, locations) change
   rarely. Cache resolved display names in Redis with short TTL (5 min).

2. **Batch resolution**: When loading a list of relationships, use a single
   query per entity type instead of N queries. Group by `entity_type_code`,
   batch-fetch from the appropriate table.

3. **Denormalized type codes**: `entity_relationships` stores
   `from_entity_type_code` / `to_entity_type_code` directly to avoid joins
   through `relationship_definitions` → `entity_types` on every query.

4. **Indexes**: All lookup patterns are covered by the indexes defined above.
   Monitor query plans and add composite indexes if needed.

5. **System relationship reads**: For system FK relationships (employee→department),
   read directly from the FK columns. Do NOT duplicate into `entity_relationships`.

---

## Migration Strategy for Existing Data

This system is **additive** — it does NOT replace existing tables or FKs.

| What | Action |
|------|--------|
| `departments` table | Stays as-is. Entity type "department" registered in `entity_types` |
| `employees.department_id` FK | Stays as-is. System relationship definition exists for display purposes |
| `custom_modules` | Stays as-is. Auto-creates `entity_types` row on creation |
| `custom_field_values.entity_type` | Already uses string codes ("employee", "cm:assets") — compatible |
| Existing data | Zero migration needed. Seed scripts populate `entity_types` and `relationship_definitions` for existing tenants |

---

## Constraints & Edge Cases

1. **Tenant isolation** — all tables scoped by `tenant_id`
2. **System types immutable** — cannot delete/rename system entity types or system relationship definitions
3. **Cardinality enforcement** — validated on `createEntityRelationship`, not retroactively
4. **Circular relationships** — allowed (A→B→C→A) since they may be valid (e.g. org hierarchies)
5. **Self-referential** — supported (entity_type can relate to itself, e.g. department→department parent)
6. **Orphaned relationships** — if a referenced entity is deleted, the relationship status is set to "inactive" via a cleanup job or checked at read time
7. **Relationship metadata** — optional JSONB for future extensibility (effective dates, assignment types)
8. **Display name resolution** — if referenced entity is deleted/archived, show "Deleted <type> #<id>"
9. **Maximum relationships** — no hard limit, but UI paginates after 50 per definition
10. **Custom module deletion** — cascade: soft-delete entity_type → soft-delete relationship_definitions → soft-delete entity_relationships

---

## Out of Scope (Future)

- Relationship-based workflow triggers (e.g. "when employee assigned to cost center, notify manager")
- Relationship versioning / history (track when relationships changed over time)
- Relationship-level permissions (who can create/delete specific relationship types)
- Graph queries (e.g. "find all entities 2 hops from this employee")
- Relationship-based computed fields (e.g. "count of employees in this cost center")
- Bi-directional sync between system FKs and entity_relationships (keeping them separate is simpler)
