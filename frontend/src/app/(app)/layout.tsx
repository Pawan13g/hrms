"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"
import { tokens } from "@/lib/auth-tokens"

// AppLayout gates every route inside the (app) group on a present access
// token. The check runs in a useEffect so SSR doesn't try to read
// localStorage; on the first client render we either render the shell
// (token present) or redirect to /login (token absent).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!tokens.access()) {
      router.replace("/login")
      return
    }
    setAuthReady(true)
  }, [router])

  if (!authReady) return null

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
