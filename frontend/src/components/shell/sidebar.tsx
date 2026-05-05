"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  LayoutDashboard,
  MapPin,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  // matchPrefix lets the active state extend to nested routes without
  // requiring an exact match on `pathname === href`.
  matchPrefix?: string
}

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  {
    href: "/org/departments",
    label: "Org",
    icon: Building2,
    matchPrefix: "/org",
  },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-800 bg-slate-900 py-4">
      <Link
        href="/dashboard"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-violet-600 text-white"
        aria-label="HRMS home"
      >
        <span className="text-base font-semibold">H</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = item.matchPrefix
            ? pathname.startsWith(item.matchPrefix)
            : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
