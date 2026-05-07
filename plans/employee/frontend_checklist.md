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

## Required from completed backend — frontend done

### Org structure UI (backend M2 done)

#### Departments — tree CRUD
- [x] `/org/departments` list page rendering the tree (parent → children)
- [x] Create department dialog (name, code, optional parent) — shadcn Dialog + shadcn Form
- [x] Edit department (name, code, parent picker that excludes self + descendants)
- [x] Soft-delete confirmation flow
- [x] TanStack Query hooks with cache invalidation + Sonner toasts

#### Designations
- [x] `/org/designations` list page (filter by department) — shadcn Table + Badge
- [x] Create/Edit designation (title, level, departmentId) — shadcn Form
- [x] Soft-delete confirmation + toast

#### Locations
- [x] `/org/locations` list page — shadcn Table + Badge
- [x] Create/Edit location form with GeographyPicker + TimezonePicker — shadcn Form
- [x] Soft-delete confirmation + toast

#### Geography (read-only consumers)
- [x] `<CountrySelect />`, `<StateSelect />`, `<CitySelect />`, `<GeographyPicker />` — all shadcn Select (Radix)

### Employee UI (backend M3 done)

#### Directory
- [x] `/employees` directory page with Relay pagination, filter, sort
- [x] Empty state, loading state, error display

#### Profile page
- [x] `/employees/[id]` profile with all fields + manager + direct reports

#### CRUD forms
- [x] `/employees/new` + `/employees/[id]/edit` — shadcn Form + Zod + toasts

### Roles & Permissions (Feature 001 — backend done)

- [x] `/settings/roles` list, `/settings/roles/new`, `/settings/roles/[id]`, `/settings/roles/[id]/edit`
- [x] `lib/roles.ts` — all 10 TanStack Query hooks
- [x] Permission checklist with shadcn Checkbox grouped by domain

---

## Remaining — frontend pending

### Employee profile enhancements

- [ ] "Roles" section on employee profile: list assigned roles as Badges
- [ ] "Assign role" shadcn Select dropdown on profile → `assignRole` mutation → toast
- [ ] "Remove" button on each role badge → `revokeRole` mutation → toast (guard: can't remove own Admin)

### Reporting hierarchy

- [ ] (Stretch) `/org/chart` org-tree visualization built from `employees` traversed by `managerId`

### Tenant context

- [ ] Wire tenant name from viewer query into Topbar `tenantLabel` prop — so the user sees which org they're in
- [ ] Decode JWT to extract tenant info client-side, or query `viewer` on app shell mount

### Dashboard — real content

- [ ] Replace placeholder "Viewer" card with real dashboard widgets:
  - [ ] Total employees count card
  - [ ] Department breakdown card (counts per department)
  - [ ] Recent hires list (last 5 employees by joining date)
  - [ ] Quick actions card (links to create employee, create department, etc.)

### Permission-based UI guards

- [ ] Hide sidebar "Settings" link when user lacks `rbac.manage` permission
- [ ] Hide "Edit"/"Archive" buttons on entities when user lacks the required permission (`org.write`, `employee.write`, `employee.delete`)
- [ ] Show "Insufficient permissions" toast when a mutation returns `rbac: forbidden` (global GraphQL error handler)
- [ ] Create a `useViewerPermissions()` hook that reads perms from the viewer query or JWT decode

### Audit visibility

- [ ] Backend: expose `auditLogs(entityType, entityId)` GraphQL query
- [ ] Frontend: "Activity" / "History" tab on employee profile page showing audit entries
- [ ] Frontend: Audit log viewer page under `/settings/audit` (optional)

### UX polish

- [ ] Loading skeletons (shadcn Skeleton) instead of plain "Loading..." text on all list pages
- [ ] Breadcrumb navigation component in the topbar (e.g. Settings > Roles > Admin)
- [ ] Responsive mobile sidebar (Sheet-based slide-out on small screens)
- [ ] Empty state illustrations on directory/list pages
- [ ] Confirmation before navigating away from dirty forms (unsaved changes warning)
- [ ] Bulk actions on employee directory (multi-select → bulk archive/department change)

### Search & locator

- [ ] Wire locator search to backend `employees(filter: { search })` for real employee lookup results
- [ ] Show recent employees in locator results

---

## Cross-cutting

- [x] All paginated lists consume Relay shape (`edges`, `pageInfo`, `totalCount`)
- [x] Soft-delete UX is non-destructive — "Archive" language
- [x] UNIX UTC timestamps rendered with `Intl.DateTimeFormat`
- [x] Auth-protected routes redirect to `/login`
- [x] `Authorization: Bearer` header on all GraphQL requests
- [x] Refresh-token rotation with single-flight retry
- [x] All forms use shadcn Form (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`)
- [x] All mutations use Sonner toasts
- [x] Dark/light mode with `next-themes` + `dark:` classes throughout
- [x] All selects use shadcn Select (Radix) — no native `<select>`
- [ ] Tenant context visible in app shell (pending)
- [ ] Permission-based UI guards (pending)

---

## Out of scope

- Custom fields builder / dynamic form rendering (M4 backend pending)
- Per-role field permissions on employee read/write (backend pending)
- Postgres RLS surface (backend defense-in-depth, no frontend impact)
- Invitation flow with role pre-assignment (future feature)
- Role hierarchy / inheritance (keep flat for v1)
