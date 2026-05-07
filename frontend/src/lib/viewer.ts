"use client"

import { useQuery } from "@tanstack/react-query"
import { gqlRequest } from "./graphql"

type Viewer = {
  userId: string
  tenantId: string
  permissions: string[]
}

const VIEWER_Q = /* GraphQL */ `
  query Viewer {
    viewer { userId tenantId permissions }
  }
`

export function useViewer() {
  return useQuery({
    queryKey: ["viewer"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const r = await gqlRequest<{ viewer: Viewer | null }>(VIEWER_Q)
      return r.viewer
    },
  })
}

export function useViewerPermissions(): Set<string> {
  const { data } = useViewer()
  return new Set(data?.permissions ?? [])
}

export function useHasPermission(key: string): boolean {
  const perms = useViewerPermissions()
  return perms.has(key)
}
