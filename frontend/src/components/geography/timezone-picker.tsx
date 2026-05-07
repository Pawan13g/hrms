"use client"

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FALLBACK = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Australia/Sydney",
]

export function TimezonePicker({
  value,
  onChange,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
}) {
  const zones = useMemo<string[]>(() => {
    const intl = (
      Intl as typeof Intl & {
        supportedValuesOf?: (key: string) => string[]
      }
    ).supportedValuesOf
    if (typeof intl === "function") {
      try {
        return intl("timeZone")
      } catch {
        return FALLBACK
      }
    }
    return FALLBACK
  }, [])

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger className="h-10">
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No timezone</SelectItem>
        {zones.map((z) => (
          <SelectItem key={z} value={z}>
            {z}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
