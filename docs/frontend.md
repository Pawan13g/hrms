# Frontend (Next.js + ShadCN)

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS + ShadCN UI primitives
- TanStack Query for server state
- `graphql-request` (or `urql`) + `@graphql-codegen/cli` for typed operations
- React Hook Form + Zod for forms
- `lucide-react` for icons
- `date-fns` for date formatting

## Setup
```bash
pnpm create next-app frontend --ts --app --tailwind --eslint
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query graphql graphql-request react-hook-form zod @hookform/resolvers date-fns lucide-react
pnpm add -D @graphql-codegen/cli @graphql-codegen/client-preset
```

`shadcn@latest add button input select dialog dropdown-menu table tabs form toast sheet command avatar badge tooltip skeleton textarea checkbox switch combobox`.

## Directory structure
```
app/
├── (auth)/login/page.tsx
├── (app)/
│   ├── layout.tsx                 # protected shell
│   ├── employees/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── org/
│   │   ├── departments/page.tsx
│   │   ├── designations/page.tsx
│   │   └── locations/page.tsx
│   └── settings/
│       ├── roles/page.tsx
│       ├── custom-fields/page.tsx
│       └── audit-log/page.tsx
components/
├── ui/                            # shadcn primitives
├── employees/
├── org/
├── custom-fields/
└── shared/
lib/
├── graphql/
│   ├── client.ts
│   ├── operations/                # *.graphql
│   └── generated.ts               # codegen output
├── auth/
├── permissions.ts
└── zod/
```

## GraphQL client
- Single instance (`lib/graphql/client.ts`) wrapping `graphql-request`.
- Reads access token from in-memory store. On 401 calls `/auth/refresh`, retries once.
- Pass `X-Tenant-Code` header from the active tenant in user context.

## Codegen
`codegen.ts` config:
```ts
import type { CodegenConfig } from '@graphql-codegen/cli';
const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:8080/graphql',
  documents: ['lib/graphql/operations/**/*.graphql'],
  generates: {
    'lib/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    },
  },
};
export default config;
```

Run `pnpm codegen` whenever schema or operations change. CI fails if generated file is out of date.

## Auth
- Login → POST `/auth/login` → store `access` in memory, `refresh` in `httpOnly` cookie set by backend.
- `useMe()` query fetches `me` and seeds React Query cache + permissions context.
- `<RequireAuth>` redirects to `/login` if no access token.

## Permissions in UI
```tsx
const { has } = usePermissions();
if (!has('employee.write')) return null;

<Can perm="employee.delete">
  <Button variant="destructive">Delete</Button>
</Can>
```
The server is the source of truth — UI checks are for UX only.

## Page patterns

### Directory list
- ShadCN `Table` + `DropdownMenu` row actions.
- Filters in a `Sheet` (mobile) or sidebar (desktop).
- Cursor pagination: `Load more` button or auto-infinite scroll.
- Empty / loading / error states for every async surface.

### Forms
- Always `useForm` with a Zod schema mirroring backend validation.
- Inputs from `components/ui/form` (label, error, description).
- Async submit → toast on success / error.
- Disable submit while pending; show optimistic state where safe.

### Dynamic form (custom fields)
```tsx
<DynamicForm formKey="employee" entityType="employee" entityId={id} />
```
Renders the right input per `dataType`:
- `TEXT` → `Input`
- `NUMBER` → `Input type=number`
- `DATE` → date picker (ShadCN calendar inside popover)
- `BOOLEAN` → `Switch`
- `SELECT` → `Select`
- `MULTISELECT` → multi `Combobox`
- `JSON` → JSON textarea with validate-on-blur

## Theming
- ShadCN default tokens; HRMS palette overrides defined in `app/globals.css` under `:root` and `.dark`.
- Dark mode via `next-themes`.

## A11y
- All interactive elements keyboard reachable.
- ShadCN primitives are accessible by default — don't bypass them.
- Tables get scoped headers; forms get explicit `<label>` (via `FormLabel`).
- Lighthouse a11y target: ≥ 95.

## Testing
- Vitest + React Testing Library for components.
- Mock GraphQL via MSW for integration-style component tests.
- Playwright (phase 2) for end-to-end flows.
