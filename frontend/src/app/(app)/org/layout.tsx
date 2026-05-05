"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/org/departments", label: "Departments" },
  { href: "/org/designations", label: "Designations" },
  { href: "/org/locations", label: "Locations" },
]

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Org structure</h1>
        <p className="text-sm text-slate-600">
          Manage departments, designations, and physical locations.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                active
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-600 hover:text-slate-900",
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
