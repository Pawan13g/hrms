"use client"

import { useQuery } from "@tanstack/react-query"
import { gqlRequest } from "@/lib/graphql"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
        <p className="text-sm text-muted-foreground">
          Welcome back. The org structure and employee modules are wired up to
          the backend — pages are coming next session.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Viewer</CardTitle>
          <CardDescription>
            Smoke test for auth + tenant + RBAC plumbing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading viewer...</p>
          ) : q.error ? (
            <p className="text-sm text-destructive">
              GraphQL error: {(q.error as Error).message}
            </p>
          ) : q.data?.viewer ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs text-foreground">
              {JSON.stringify(q.data.viewer, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No viewer.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
