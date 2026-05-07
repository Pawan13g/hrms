"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  LayoutDashboard,
  MapPin,
  Settings,
  Tag,
  Users,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type Route = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string[]
}

const pages: Route[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "overview"],
  },
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
    keywords: ["people", "staff", "team"],
  },
  {
    label: "Departments",
    href: "/org/departments",
    icon: Building2,
    keywords: ["org", "structure", "team"],
  },
  {
    label: "Designations",
    href: "/org/designations",
    icon: Tag,
    keywords: ["job title", "role", "position"],
  },
  {
    label: "Locations",
    href: "/org/locations",
    icon: MapPin,
    keywords: ["office", "branch", "site"],
  },
  {
    label: "Roles & Permissions",
    href: "/settings/roles",
    icon: Settings,
    keywords: ["rbac", "access", "admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    keywords: ["preferences", "config"],
  },
]

const actions: Route[] = [
  {
    label: "New Employee",
    href: "/employees/new",
    icon: Users,
    keywords: ["add", "create", "hire"],
  },
  {
    label: "New Role",
    href: "/settings/roles/new",
    icon: Settings,
    keywords: ["add", "create", "rbac"],
  },
  {
    label: "New Department",
    href: "/org/departments?action=create",
    icon: Building2,
    keywords: ["add", "create"],
  },
  {
    label: "New Designation",
    href: "/org/designations?action=create",
    icon: Tag,
    keywords: ["add", "create"],
  },
  {
    label: "New Location",
    href: "/org/locations?action=create",
    icon: MapPin,
    keywords: ["add", "create"],
  },
]

export function Locator() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Where do you want to go?" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((r) => (
            <CommandItem
              key={r.href}
              value={`${r.label} ${r.keywords?.join(" ") ?? ""}`}
              onSelect={() => go(r.href)}
            >
              <r.icon className="h-4 w-4 text-muted-foreground" />
              <span>{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          {actions.map((r) => (
            <CommandItem
              key={r.href}
              value={`${r.label} ${r.keywords?.join(" ") ?? ""}`}
              onSelect={() => go(r.href)}
            >
              <r.icon className="h-4 w-4 text-muted-foreground" />
              <span>{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
