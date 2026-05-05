"use client"

import { Bell, ChevronDown, LogOut, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { tokens } from "@/lib/auth-tokens"

export function Topbar({ tenantLabel }: { tenantLabel?: string }) {
  const router = useRouter()
  const onSignOut = () => {
    tokens.clear()
    router.replace("/login")
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <div className="relative mx-auto w-full max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search…"
          className="h-9 w-full rounded-md bg-slate-100 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600"
        />
      </div>

      {tenantLabel && (
        <span className="hidden rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 sm:inline">
          {tenantLabel}
        </span>
      )}

      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white"
          aria-hidden
        >
          U
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
        <button
          type="button"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
