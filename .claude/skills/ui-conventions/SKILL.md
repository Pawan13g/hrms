---
name: ui-conventions
description: Use whenever editing or adding UI in `frontend/` — components, pages, forms, layouts, screens. Locks the design system: violet-accent + light-canvas + white-card aesthetic from `frontend/design/*.webp`, shadcn primitives via the `shadcn` MCP, RHF + Zod forms.
---

# Frontend UI conventions

Read before writing any frontend code under `frontend/src/`.

## Visual source of truth — `frontend/design/*.webp`

Before adding or restyling any component / page / layout, **read the
relevant samples in `frontend/design/`** (the Read tool handles .webp
directly; pass an absolute path). They are the canonical design language
for this app.

Workflow:

1. Open one or two samples that match what you're building (e.g. a list
   page, a form with stepper, a side-drawer detail view).
2. Extract visible tokens — colors, typography scale, spacing, radius,
   shadow, component shapes — and apply those to the new code.
3. If the rules below disagree with the samples, **the samples win**.
   Update both the code AND this skill in the same change so the next
   session sees the corrected rule.

## Stack

- Next.js App Router (`frontend/src/app/`); auth-protected pages live
  inside the `(app)` route group with `app/(app)/layout.tsx`.
- TypeScript, strict.
- Tailwind CSS — raw palette tokens only (no `--background` / `--muted`
  CSS-vars; `components.json` has `cssVariables: false`).
- **shadcn/ui via the `shadcn` MCP** — primitives land in `@/components/ui/`.
- React Hook Form + Zod (`@hookform/resolvers/zod`).
- TanStack Query for server state.
- `graphql-request` for the GraphQL transport, wrapped by `gqlRequest()`
  in `@/lib/graphql` (auto-attaches Bearer token + retries once on 401
  via `/auth/refresh`).
- Path alias: `@/*` → `frontend/src/*`.
- `cn()` helper at `@/lib/utils`.
- Icons: `lucide-react` (thin-line, matches the samples).

## Theme — extracted from samples

The samples use a **violet-accent + light-canvas + white-card** aesthetic.
Treat these as the current default; revisit if a new sample contradicts.

### Color palette

| Use | Token |
| --- | --- |
| Primary action (buttons, focus ring, active nav pill) | `primary/600`; hover `primary/700`; subtle bg `primary/50` |
| Page canvas | `bg-slate-50` |
| Card / surface | `bg-white` with `border border-slate-200`, `rounded-xl`, `shadow-sm` |
| Sidebar (dark icon-only column) | `bg-slate-900`; icon idle `text-slate-400`; hover `bg-slate-800 text-white`; active `bg-violet-600 text-white` |
| Topbar | `bg-white` with `border-b border-slate-200` |
| Default text | `text-slate-900` |
| Secondary text | `text-slate-600` |
| Tertiary / placeholder | `text-slate-400` / `text-slate-500` |
| Input border | `border-slate-300` |
| Hover surface | `hover:bg-slate-100` |
| Errors | `text-red-600`, `bg-red-50` |

### Status / semantic chips

Use soft-bg + colored-text pills, `rounded-full px-2 py-0.5 text-xs font-medium`:

| Status | Classes |
| --- | --- |
| Success / Completed | `bg-emerald-50 text-emerald-700` |
| Doing / In progress | `bg-blue-50 text-blue-700` |
| Warning / Medium priority | `bg-amber-50 text-amber-700` |
| Danger / Overdue / High priority | `bg-red-50 text-red-700` |
| Neutral / Todo | `bg-slate-100 text-slate-700` |

### Radius + shadow

- Cards: `rounded-xl`, `shadow-sm`.
- Buttons / inputs / chips: `rounded-md` (chips can be `rounded-full`).
- No heavy shadows. The samples are flat.

### Typography

- Headings: `font-semibold tracking-tight`. Page title `text-2xl`, card title `text-lg`.
- Body: default weight, `text-sm` is the workhorse size.
- Labels: `text-sm font-medium text-slate-700`.

### Forms with stepper (samples 1, 2, 5)

Multi-step forms use a left-rail stepper + right-side form card. Steps
are listed as `STEP 1 / Title / subtitle`, the active step has a violet
icon background and a violet-50 panel highlight.

### Side drawer (samples 4, 7)

Detail views slide in from the right with a backdrop, ~400-600px wide,
`bg-white rounded-xl shadow-lg`. Header has title + close button + paginator
(`< 01 of 100 >`).

### Form rhythm

- `space-y-4` between fields.
- `space-y-1` inside a field block (label / input / error).
- `space-y-6` between major sections inside a card.
- Card padding: `p-6` (default), `p-8` for hero cards.

## Form template

Use this for any new form. The default `<Button>` is violet.

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({ /* … */ })
type FormValues = z.infer<typeof schema>

export function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const m = useMutation({ mutationFn: /* … */ })

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((v) => m.mutate(v))}
      noValidate
    >
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      {m.error && (
        <p className="text-sm text-red-600">{(m.error as Error).message}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || m.isPending}>
        {m.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
```

## Don'ts

- No hand-rolled buttons. Extend `<Button variant="…">` instead.
- No HTML5 form validation. `noValidate` + Zod owns it.
- No inline error text on the same line as the input — separate `<p>` underneath.
- No new client-state library. TanStack Query + RHF is the whole stack.
- No raw `fetch` to `/graphql`. Use `gqlRequest()` from `@/lib/graphql` so
  Bearer + 401-refresh-and-retry are uniform.
