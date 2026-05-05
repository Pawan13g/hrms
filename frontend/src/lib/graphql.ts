import { ClientError, GraphQLClient } from "graphql-request"
import { refreshTokens, tokens } from "./auth-tokens"

const endpoint =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8080/graphql"

function clientWithAuth(): GraphQLClient {
  const headers: Record<string, string> = {}
  const access = tokens.access()
  if (access) headers["Authorization"] = `Bearer ${access}`
  return new GraphQLClient(endpoint, { headers })
}

// gqlRequest is the canonical way for the app to talk to GraphQL. It
// auto-attaches the Bearer token and, on a single 401 from the backend
// AuthMiddleware (expired token path), tries `/auth/refresh` once and
// retries the original request. Any further 401 surfaces as an error
// for the caller to translate into a redirect-to-login.
export async function gqlRequest<T = unknown, V = Record<string, unknown>>(
  document: string,
  variables?: V,
): Promise<T> {
  try {
    return await clientWithAuth().request<T>(document, variables ?? undefined)
  } catch (err) {
    if (isUnauthorized(err)) {
      const refreshed = await refreshTokens()
      if (!refreshed) throw err
      return await clientWithAuth().request<T>(document, variables ?? undefined)
    }
    throw err
  }
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof ClientError && err.response.status === 401
}

// gqlClient is kept for code that pre-dates gqlRequest; new callers should
// use gqlRequest above. Deprecate in a follow-up once nothing references it.
export function gqlClient(token?: string, tenantCode?: string) {
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (tenantCode) headers["X-Tenant-Code"] = tenantCode
  return new GraphQLClient(endpoint, { headers })
}
