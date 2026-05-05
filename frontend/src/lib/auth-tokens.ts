// Token storage + refresh helper.
//
// Tokens land in localStorage today; a follow-up swaps to httpOnly cookies
// once the backend exposes a `Set-Cookie`-style refresh endpoint. Until
// then keep all token reads/writes funneled through this module so the
// swap is a single-file change.

const ACCESS_KEY = "hrms.access"
const REFRESH_KEY = "hrms.refresh"

const REST_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export const tokens = {
  access(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(ACCESS_KEY)
  },
  refresh(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(REFRESH_KEY)
  },
  setBoth(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// Single-flight refresh: concurrent 401s share one in-flight request so we
// don't issue N parallel /auth/refresh calls when a query batch all fails
// at once.
let inflight: Promise<boolean> | null = null

export function refreshTokens(): Promise<boolean> {
  if (inflight) return inflight
  inflight = (async () => {
    const r = tokens.refresh()
    if (!r) {
      tokens.clear()
      return false
    }
    try {
      const res = await fetch(`${REST_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: r }),
      })
      if (!res.ok) {
        tokens.clear()
        return false
      }
      const body = (await res.json()) as {
        accessToken: string
        refreshToken: string
      }
      tokens.setBoth(body.accessToken, body.refreshToken)
      return true
    } catch {
      tokens.clear()
      return false
    } finally {
      // Release the slot for the next refresh round.
      inflight = null
    }
  })()
  return inflight
}
