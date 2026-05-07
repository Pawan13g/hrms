"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHasPermission } from "@/lib/viewer"

const tabs = [
  { href: "/settings/roles", label: "Roles & Permissions" },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const canManageRbac = useHasPermission("rbac.manage")

  if (!canManageRbac) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Access denied</p>
        <p className="text-xs">You need the <code className="rounded bg-muted px-1.5 py-0.5 font-mono">rbac.manage</code> permission to view settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization settings.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
