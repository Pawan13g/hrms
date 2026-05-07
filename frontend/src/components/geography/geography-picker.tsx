"use client"

import { useEffect } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCities, useCountries, useStates } from "@/lib/org"

export type GeographyValue = {
  countryId?: string | null
  stateId?: string | null
  cityId?: string | null
}

export function CountrySelect({
  value,
  onChange,
  required,
  disabled,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
  required?: boolean
  disabled?: boolean
}) {
  const q = useCountries()
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      required={required}
      disabled={disabled || q.isLoading}
    >
      <SelectTrigger className="h-10">
        <SelectValue placeholder={q.isLoading ? "Loading..." : "Select country"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No country</SelectItem>
        {q.data?.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function StateSelect({
  countryId,
  value,
  onChange,
  disabled,
}: {
  countryId: string | null | undefined
  value: string | null | undefined
  onChange: (v: string | null) => void
  disabled?: boolean
}) {
  const q = useStates(countryId)
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      disabled={disabled || !countryId || q.isLoading}
    >
      <SelectTrigger className="h-10">
        <SelectValue
          placeholder={
            !countryId ? "Pick a country first" : q.isLoading ? "Loading..." : "Select state"
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No state</SelectItem>
        {q.data?.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function CitySelect({
  stateId,
  value,
  onChange,
  disabled,
}: {
  stateId: string | null | undefined
  value: string | null | undefined
  onChange: (v: string | null) => void
  disabled?: boolean
}) {
  const q = useCities(stateId)
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      disabled={disabled || !stateId || q.isLoading}
    >
      <SelectTrigger className="h-10">
        <SelectValue
          placeholder={
            !stateId ? "Pick a state first" : q.isLoading ? "Loading..." : "Select city"
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No city</SelectItem>
        {q.data?.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function GeographyPicker({
  value,
  onChange,
}: {
  value: GeographyValue
  onChange: (v: GeographyValue) => void
}) {
  useEffect(() => {
    if (!value.countryId && (value.stateId || value.cityId)) {
      onChange({ countryId: null, stateId: null, cityId: null })
    } else if (!value.stateId && value.cityId) {
      onChange({ ...value, cityId: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.countryId, value.stateId])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1">
        <Label>Country</Label>
        <CountrySelect
          value={value.countryId}
          onChange={(countryId) =>
            onChange({ countryId, stateId: null, cityId: null })
          }
        />
      </div>
      <div className="space-y-1">
        <Label>State</Label>
        <StateSelect
          countryId={value.countryId}
          value={value.stateId}
          onChange={(stateId) => onChange({ ...value, stateId, cityId: null })}
        />
      </div>
      <div className="space-y-1">
        <Label>City</Label>
        <CitySelect
          stateId={value.stateId}
          value={value.cityId}
          onChange={(cityId) => onChange({ ...value, cityId })}
        />
      </div>
    </div>
  )
}
