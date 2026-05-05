# Frontend Implementation Plan (Next.js + ShadCN)

## Repo layout
```
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 # shell with sidebar, tenant switcher
│   │   ├── employees/
│   │   │   ├── page.tsx               # directory list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # profile (tabs)
│   │   │       └── edit/page.tsx
│   │   ├── org/
│   │   │   ├── departments/page.tsx
│   │   │   ├── designations/page.tsx
│   │   │   └── locations/page.tsx
│   │   ├── settings/
│   │   │   ├── roles/page.tsx
│   │   │   ├── custom-fields/page.tsx
│   │   │   └── audit-log/page.tsx
│   ├── api/auth/[...]/route.ts        # proxy to backend if needed
│   └── layout.tsx
├── components/
│   ├── ui/                            # shadcn primitives (auto-generated)
│   ├── employees/
│   │   ├── employee-table.tsx
│   │   ├── employee-form.tsx
│   │   └── manager-picker.tsx
│   ├── org/
│   ├── custom-fields/
│   │   ├── dynamic-form.tsx           # renders custom fields by data_type
│   │   └── field-renderer.tsx
│   └── shared/
├── lib/
│   ├── graphql/
│   │   ├── client.ts                  # urql or graphql-request
│   │   ├── codegen.ts                 # graphql-codegen config
│   │   └── operations/                # *.graphql per page
│   ├── auth/                          # token store, refresh
│   ├── permissions.ts                 # client-side perm checks (UX only — server is truth)
│   └── zod/                           # shared schemas
└── package.json
```

## Setup
1. `pnpm create next-app frontend --ts --app --tailwind --eslint`
2. `pnpm dlx shadcn@latest init` → install primitives: `button`, `input`, `select`, `dialog`, `dropdown-menu`, `table`, `tabs`, `form`, `toast`, `sheet`, `command`, `avatar`, `badge`, `tooltip`, `skeleton`.
3. Add deps: `@tanstack/react-query`, `graphql-request`, `@graphql-codegen/cli` (+ typed-document-node plugin), `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `lucide-react`.
4. Configure GraphQL codegen: pulls schema from backend `/graphql`, emits typed hooks under `lib/graphql/generated.ts`.

## Routing & layout
- `(auth)` group: login. Redirects to `/employees` on success.
- `(app)` group: protected, shows shell — left sidebar (Employees, Org, Settings), top bar (search, profile, logout).
- All API calls go through a single `gqlClient` that injects `Authorization: Bearer <access>` and handles 401 → refresh → retry.

## Key screens

### Employee directory (`/employees`)
- Server-driven table with TanStack Query.
- Filters: department, designation, location, status, employment_type, search (name/email/code).
- Columns: avatar+name, code, designation, department, manager, location, status, actions.
- Pagination: cursor (matches GraphQL Relay connection).
- Bulk actions disabled in M3, enabled in phase 2.

### Employee profile (`/employees/[id]`)
- Tabs: Overview, Custom Fields (rendered by form key), Reports (direct reports tree), Audit.
- Inline edit gated by `employee.write` permission.
- Manager edit uses `manager-picker` Combobox with async search.

### Employee create/edit
- React Hook Form + Zod schema mirrors backend validation.
- Sections: Personal, Job, Reporting, Custom Fields.
- "Save" runs the mutation, on success toasts and routes to profile.

### Org screens
- Departments: tree view with add/move/rename. Drag-to-reparent in phase 2.
- Designations: simple table grouped by department.
- Locations: table + map preview (phase 2).

### Settings → Custom Fields
- Form list (per `module`, e.g. `employee`, `department`).
- Field editor: key, label, data_type (`text|number|date|select|multiselect|boolean|json`), required, validation JSON, options for select types, role visibility matrix (`field_permissions`).

### Settings → Roles
- Role list + permission matrix (checkbox grid by permission key, grouped by domain).

### Settings → Audit log
- Filters: entity type, action, user, date range.
- Row click → diff viewer showing `old_data` vs `new_data` (JSON tree diff).

## Permissions (client side)
- `usePermissions()` reads from JWT or `/me` query result.
- `<Can perm="employee.write">` wrapper hides UI elements; server still enforces.

## Dynamic forms (custom fields)
- `DynamicForm({ formKey, entityType, entityId })`:
  1. fetches `customForm(formKey)` → fields[]
  2. fetches `customFieldValues(entityType, entityId)`
  3. renders inputs by `data_type`
  4. submit → batched `setCustomFieldValues` mutation

## State management
- TanStack Query for server state. No Redux/Zustand unless needed.
- Form state via RHF; persistent UI state (sidebar collapsed, table density) in `localStorage` via a tiny hook.

## Testing
- Unit: components with Vitest + Testing Library.
- E2E (phase 2): Playwright covering login → create employee → assign manager → set custom field.

## Definition of done per screen
- Loading, empty, and error states
- Permission-gated actions
- Toast on success / error
- Mobile responsive (sidebar collapses ≤768px)
- Lighthouse a11y ≥ 95
