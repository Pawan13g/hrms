"use client"

import { useQuery } from "@tanstack/react-query"
import { gqlRequest } from "@/lib/graphql"

type ViewerResponse = {
  viewer: {
    userId: string
    tenantId: string
    permissions: string[]
  } | null
}

const VIEWER_QUERY = /* GraphQL */ `
  query Viewer {
    viewer {
      userId
      tenantId
      permissions
    }
  }
`

export default function DashboardPage() {
  const q = useQuery({
    queryKey: ["viewer"],
    queryFn: () => gqlRequest<ViewerResponse>(VIEWER_QUERY),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Welcome back. The org structure and employee modules are wired up to
          the backend — pages are coming next session.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Viewer</h2>
        <p className="mb-4 text-sm text-slate-600">
          Smoke test for auth + tenant + RBAC plumbing.
        </p>
        {q.isLoading ? (
          <p className="text-sm text-slate-600">Loading viewer…</p>
        ) : q.error ? (
          <p className="text-sm text-red-600">
            GraphQL error: {(q.error as Error).message}
          </p>
        ) : q.data?.viewer ? (
          <pre className="overflow-x-auto rounded-md bg-slate-50 p-4 text-xs text-slate-900">
            {JSON.stringify(q.data.viewer, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-slate-600">No viewer.</p>
        )}
      </section>
    </div>
  )
}
