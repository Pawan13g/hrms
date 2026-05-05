"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { tokens } from "@/lib/auth-tokens"

// Root just dispatches based on auth state. Authenticated users land in the
// app shell at /dashboard; everyone else goes to /login.
export default function RootRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace(tokens.access() ? "/dashboard" : "/login")
  }, [router])
  return null
}
