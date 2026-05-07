const REST_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

export type LoginInput = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  accessExp: string
  refreshExp: string
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const res = await fetch(`${REST_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `login failed: ${res.status}`)
  }
  return res.json()
}

export type RegisterInput = {
  tenantName: string
  firstName: string
  lastName: string
  email: string
  password: string
  countryId?: number | null
  cityId?: number | null
}

export type RegisterResponse = {
  userId: number
  tenantId: number
  tenantCode: string
  email: string
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const res = await fetch(`${REST_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `register failed: ${res.status}`)
  }
  return res.json()
}
