"use client"

import { useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useCities, useCountries, useStates } from "@/lib/org"

// Three dependent selects for country → state → city. Selecting a new
// country clears state and city; selecting a new state clears city.
// Surfaces every backend tier (country/state/city) as the canonical id
// — the parent owns the values via the controlled-input contract.
export type GeographyValue = {
  countryId?: string | null
  stateId?: string | null
  cityId?: string | null
}

export function CountrySelect({
  value,
  onChange,
  id,
  required,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
  id?: string
  required?: boolean
}) {
  const q = useCountries()
  return (
    <Select
      id={id}
      value={value ?? ""}
      required={required}
      disabled={q.isLoading}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{q.isLoading ? "Loading…" : "Select country"}</option>
      {q.data?.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  )
}

export function StateSelect({
  countryId,
  value,
  onChange,
  id,
}: {
  countryId: string | null | undefined
  value: string | null | undefined
  onChange: (v: string | null) => void
  id?: string
}) {
  const q = useStates(countryId)
  return (
    <Select
      id={id}
      value={value ?? ""}
      disabled={!countryId || q.isLoading}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">
        {!countryId ? "Pick a country first" : q.isLoading ? "Loading…" : "Select state"}
      </option>
      {q.data?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </Select>
  )
}

export function CitySelect({
  stateId,
  value,
  onChange,
  id,
}: {
  stateId: string | null | undefined
  value: string | null | undefined
  onChange: (v: string | null) => void
  id?: string
}) {
  const q = useCities(stateId)
  return (
    <Select
      id={id}
      value={value ?? ""}
      disabled={!stateId || q.isLoading}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">
        {!stateId ? "Pick a state first" : q.isLoading ? "Loading…" : "Select city"}
      </option>
      {q.data?.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  )
}

// GeographyPicker is the composed three-tier control. The parent owns the
// {countryId, stateId, cityId} state; this component resets dependents on
// each parent change.
export function GeographyPicker({
  value,
  onChange,
}: {
  value: GeographyValue
  onChange: (v: GeographyValue) => void
}) {
  // Defensively clear children when a parent goes back to null — protects
  // against stale ids slipping through if the consumer forgets to.
  useEffect(() => {
    if (!value.countryId && (value.stateId || value.cityId)) {
      onChange({ countryId: null, stateId: null, cityId: null })
    } else if (!value.stateId && value.cityId) {
      onChange({ ...value, cityId: null })
    }
    // We only react to id changes, not the onChange identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.countryId, value.stateId])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="country">Country</Label>
        <CountrySelect
          id="country"
          value={value.countryId}
          onChange={(countryId) =>
            onChange({ countryId, stateId: null, cityId: null })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="state">State</Label>
        <StateSelect
          id="state"
          countryId={value.countryId}
          value={value.stateId}
          onChange={(stateId) => onChange({ ...value, stateId, cityId: null })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="city">City</Label>
        <CitySelect
          id="city"
          stateId={value.stateId}
          value={value.cityId}
          onChange={(cityId) => onChange({ ...value, cityId })}
        />
      </div>
    </div>
  )
}
