"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Building2,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  User,
  Users,
} from "lucide-react"
import { useViewerPermissions } from "@/lib/viewer"
import { tokens } from "@/lib/auth-tokens"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  matchPrefix?: string
  requirePerm?: string
}

const mainItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  {
    href: "/org/departments",
    label: "Org Structure",
    icon: Building2,
    matchPrefix: "/org",
  },
  { href: "/locations", label: "Locations", icon: MapPin },
]

const bottomItems: NavItem[] = [
  {
    href: "/settings/roles",
    label: "Settings",
    icon: Settings,
    matchPrefix: "/settings",
    requirePerm: "rbac.manage",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const perms = useViewerPermissions()
  const router = useRouter()

  const visibleMain = mainItems.filter(
    (i) => !i.requirePerm || perms.has(i.requirePerm),
  )
  const visibleBottom = bottomItems.filter(
    (i) => !i.requirePerm || perms.has(i.requirePerm),
  )

  const isActive = (item: NavItem) =>
    item.matchPrefix
      ? pathname.startsWith(item.matchPrefix)
      : pathname === item.href || pathname.startsWith(item.href + "/")

  const onSignOut = () => {
    tokens.clear()
    router.replace("/login")
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="HRMS"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">H</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">HRMS</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">Sodium Labs</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive(item)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {visibleBottom.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={isActive(item)}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Account"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                      U
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">My Account</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-48"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-foreground">My account</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
