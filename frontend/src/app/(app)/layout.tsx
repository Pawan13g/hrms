"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"
import { tokens } from "@/lib/auth-tokens"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

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
    <SidebarProvider >
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-auto rounded-tl-2xl">
          <div className="h-full border-border bg-card p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
