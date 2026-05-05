import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Native <select> styled to match the samples. Hand-rolled instead of
// @radix-ui/react-select to keep the dependency surface small — when the
// design needs grouped/searchable selects (e.g. employee manager picker),
// swap this single primitive for the radix one.
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  ),
)
Select.displayName = "Select"
