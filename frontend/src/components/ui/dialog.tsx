"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Minimal controlled modal. Escapes via Esc, click-outside, or the close
// button. Body scroll is locked while open. Hand-rolled to avoid the
// @radix-ui/react-dialog dependency until something needs the focus-trap
// guarantees radix gives.
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="presentation"
    >
      {children}
    </div>
  )
}

export function DialogContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DialogHeader({
  title,
  description,
  onClose,
}: {
  title: string
  description?: string
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && <p className="text-sm text-slate-600">{description}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function DialogBody({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
      {children}
    </div>
  )
}
