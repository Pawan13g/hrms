# Employee Module — Frontend Checklist

Derived from `plans/employee/checklist.md`: every backend or shared item
already marked `[x]` that demands a frontend counterpart is listed here as a
required task. Tick a row only when the frontend code lands and matches the
behavior the backend already exposes — per `feedback_no_blind_checklist_ticks`,
no checks without evidence.

---

## Already shipped on the frontend (M1 baseline)

These rows mirror M1 lines from the source checklist that *are* the frontend.

- [x] Next.js (App Router) + TypeScript scaffolded — `frontend/`
- [x] ShadCN initialized with required primitives — `frontend/src/components/ui/{button,input,label}.tsx` via cva, violet-accent variants
- [x] TanStack Query + GraphQL client wired — `frontend/src/components/providers.tsx`, `frontend/src/lib/graphql.ts`
- [x] React Hook Form + Zod baseline — `frontend/src/app/login/page.tsx`, `frontend/src/app/register/page.tsx`
- [x] Auth: JWT access + refresh tokens issued; tokens persisted client-side — `frontend/src/lib/auth-tokens.ts` (replaces direct localStorage access; single-flight refresh + clear on logout)
- [x] `/login` page (split-screen + violet card on slate-50 canvas)
- [x] `/register` page (split-screen + violet card; tenant auto-created server-side)
- [x] Shared `<AuthBrandPanel />` component re-skinned to slate-900 + violet logo tile
- [x] UI conventions skill (`.claude/skills/ui-conventions/SKILL.md`) — extracted violet-accent + light-canvas + white-card design system from `frontend/design/*.webp` samples
- [x] shadcn MCP (`.mcp.json` + `frontend/components.json`)
- [x] App shell — dark icon-only `<Sidebar />` (active state = violet pill) + white `<Topbar />` with search/bell/avatar/sign-out (`frontend/src/components/shell/`)
- [x] Auth-protected `(app)` route group with client-side token guard — `frontend/src/app/(app)/layout.tsx` redirects to `/login` when `hrms.access` missing
- [x] `/dashboard` placeholder inside the shell — runs viewer query through `gqlRequest` to smoke-test auth plumbing
- [x] `/` root dispatcher — redirects to `/dashboard` or `/login` based on token presence
- [x] GraphQL transport with auto-bearer + 401 refresh-and-retry — `gqlRequest()` in `frontend/src/lib/graphql.ts`, single-flight refresh in `auth-tokens.ts`

---

## Required from completed backend — frontend pending

### Org structure UI (backend M2 done)

Source rows: departments tree, designations, locations, geography catalog,
Org domain.

#### Departments — tree CRUD
- [ ] `/org/departments` list page rendering the tree (parent → children)
- [ ] Create department dialog (name, code, optional parent)
- [ ] Edit department (name, code, parent picker that excludes self + descendants — backend rejects too, but mirror client-side for UX)
- [ ] Soft-delete confirmation flow (`deleteDepartment` mutation flips status to `deleted`)
- [ ] TanStack Query hooks: `useDepartments`, `useCreateDepartment`, `useUpdateDepartment`, `useDeleteDepartment` with cache invalidation

#### Designations
- [ ] `/org/designations` list page (filter by department)
- [ ] Create designation form (title, level, departmentId)
- [ ] Edit designation
- [ ] Soft-delete confirmation
- [ ] TanStack Query hooks for queries + mutations

#### Locations
- [ ] `/org/locations` list page
- [ ] Create location form with country → state → city dependent dropdowns
- [ ] IANA timezone picker (use `Intl.supportedValuesOf("timeZone")`); validate before submit (backend uses `time.LoadLocation`)
- [ ] Edit location
- [ ] Soft-delete confirmation

#### Geography (read-only consumers)
- [ ] `<CountrySelect />` — fetches `countries` query, sorts by name
- [ ] `<StateSelect countryId>` — disabled until a country is chosen
- [ ] `<CitySelect stateId>` — disabled until a state is chosen
- [ ] Composed `<GeographyPicker />` form control reusable in location / employee forms

### Employee UI (backend M3 done)

Source rows: Employee CRUD, Directory list with pagination/filter/sort,
Reporting hierarchy via `manager_id`.

#### Directory
- [ ] `/employees` directory page
- [ ] Server-driven pagination — consume `EmployeeConnection.edges/pageInfo/totalCount`, send `first` + `after` cursor
- [ ] Filter UI: search box + status / department / designation / location / manager dropdowns (matches `EmployeeFilter` input)
- [ ] Sort UI: `EmployeeSort` enum (`CREATED_DESC`, `CREATED_ASC`, `NAME_ASC`, `NAME_DESC`, `JOINING_DESC`, `JOINING_ASC`)
- [ ] Empty state, loading skeleton, error toast

#### Profile page
- [ ] `/employees/[id]` profile route
- [ ] Render every backend-exposed field (code, names, contact, dates, employment type, FK names)
- [ ] Show reporting context: manager + direct reports list (uses `employees(filter: { managerId: <id> })`)

#### CRUD forms
- [ ] `/employees/new` — create form following the RHF + Zod template from the `ui-conventions` skill
- [ ] `/employees/[id]/edit` — edit form, only changed fields submitted (mirror backend `UpdateEmployeeInput` partial semantics)
- [ ] Manager picker that excludes the current employee + their descendants (UX layer; backend enforces with `IsDescendant`)
- [ ] Department / Designation / Location dropdowns sourced from the org module queries
- [ ] Date validation: `joiningDate <= today`, ISO `yyyy-mm-dd` (mirrors `validateJoining` in backend)

### Reporting hierarchy

- [ ] Direct-reports list on the profile page
- [ ] (Stretch) `/org/chart` org-tree visualization built from `employees` traversed by `managerId`

### Audit visibility (partial — backend write done, read query pending)

The backend writes audit rows on every employee mutation, but no `auditLogs`
GraphQL query is exposed yet. Frontend audit viewer is **blocked** on that.

- [ ] Audit history section on employee profile (BLOCKED: backend `auditLogs` resolver missing)

---

## Cross-cutting (from completed cross-cutting rows)

Source rows: GraphQL pagination = Relay (line 11 of source); soft delete via
status; UNIX UTC timestamps; tenant_id middleware; multi-tenancy isolation
enforced on every query.

- [ ] All paginated lists consume the Relay shape (`edges`, `pageInfo`, `totalCount`) — establish a shared `<RelayList />` or hook so future modules don't reinvent
- [ ] Soft-delete UX is non-destructive — confirmation copy says "Deactivate" / "Archive"; never "permanently delete"
- [ ] Render UNIX UTC timestamps with `Intl.DateTimeFormat` at the user's tz (or the employee's `location.timezone` on profile pages, per the deferred "Tenant timezone surfaced via `locations.timezone` only at render time" rule)
- [x] Auth-protected routes redirect to `/login` if no `hrms.access` token is present — `app/(app)/layout.tsx` client guard
- [ ] Tenant context: surface tenant code / name from JWT in app shell so the user knows which org they're in (Topbar has a `tenantLabel` prop slot but it's not yet wired to the JWT — needs a JWT-decode + viewer-query hop)
- [x] `Authorization: Bearer <access>` header attached to every GraphQL request via `gqlRequest()` — `frontend/src/lib/graphql.ts`
- [x] Refresh-token rotation: when a query returns 401, call `/auth/refresh`, update tokens, retry once — single-flight refresh in `frontend/src/lib/auth-tokens.ts`
- [ ] Every mutation form follows the template in `.claude/skills/ui-conventions/SKILL.md` (RHF + Zod, `noValidate`, `text-xs text-red-600` for field errors, `text-sm text-red-600` for form-level errors)

---

## Out of scope for this checklist

These are **not** included because the corresponding backend rows in the
source checklist are still `[ ]`:

- RBAC management screens (roles, permissions, role↔permission, user↔role) — backend pending
- Custom fields builder / dynamic form rendering — backend pending (M4)
- Per-role field permissions on employee read/write — backend pending
- Audit log viewer — backend write side done, but read query (`auditLogs`) not exposed yet
- Postgres RLS surface — backend defense-in-depth (no frontend impact)
- Tenant timezone *rendering* across the app (only listed above as a
  cross-cutting reminder; full rollout waits on M3 profile page)
