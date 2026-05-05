"use client"

import { useMemo } from "react"
import { Select } from "@/components/ui/select"

// Pulls the IANA tz list from the runtime when available, falling back to
// a curated set on older engines. Backend validates with `time.LoadLocation`
// so the contract is "any valid IANA tz".
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
  id,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
  id?: string
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
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Select timezone</option>
      {zones.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </Select>
  )
}
