"use client"

import { Bell, ChevronRight, Moon, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Locator } from "@/components/shell/locator"
import { SidebarTrigger } from "../ui/sidebar"

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/employees/new": "New Employee",
  "/org": "Org Structure",
  "/org/departments": "Departments",
  "/org/designations": "Designations",
  "/org/locations": "Locations",
  "/settings": "Settings",
  "/settings/roles": "Roles & Permissions",
  "/settings/roles/new": "New Role",
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let path = ""
  for (const seg of segments) {
    path += `/${seg}`
    const label = routeLabels[path]
    if (label) {
      crumbs.push({ label, href: path })
    }
  }

  if (crumbs.length === 0 && segments.length > 0) {
    const last = segments[segments.length - 1]
    crumbs.push({
      label: last.charAt(0).toUpperCase() + last.slice(1),
      href: pathname,
    })
  }

  return crumbs
}

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const crumbs = useBreadcrumbs()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-transparent pr-4">
      <SidebarTrigger/>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {i === crumbs.length - 1 ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted-foreground hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Search */}
      <button
        type="button"
        onClick={() =>
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true }),
          )
        }
        className="relative mx-auto flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      <Locator />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
