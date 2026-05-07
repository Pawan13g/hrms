// TanStack Query hooks for the org domain (departments, designations,
// locations) and the read-only geography catalog. Every mutation
// invalidates the relevant list query so the UI re-fetches without a
// page reload.
"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query"
import { gqlRequest } from "./graphql"

// ---------- Types ----------

export type Department = {
  id: string
  name: string
  code: string | null
  parentId: string | null
  status: string
  createdAt: number
  updatedAt: number
}

export type Designation = {
  id: string
  title: string
  level: number | null
  departmentId: string | null
  status: string
  createdAt: number
  updatedAt: number
}

export type Location = {
  id: string
  name: string
  addressLine1: string | null
  addressLine2: string | null
  countryId: string | null
  stateId: string | null
  cityId: string | null
  pincode: string | null
  timezone: string | null
  status: string
  createdAt: number
  updatedAt: number
}

export type Country = { id: string; name: string; isoCode: string | null }
export type State = { id: string; countryId: string | null; name: string }
export type City = { id: string; stateId: string | null; name: string }

// ---------- Departments ----------

const DEPARTMENTS_Q = /* GraphQL */ `
  query Departments {
    departments {
      id
      name
      code
      parentId
      status
      createdAt
      updatedAt
    }
  }
`

const CREATE_DEPT_M = /* GraphQL */ `
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      id
    }
  }
`

const UPDATE_DEPT_M = /* GraphQL */ `
  mutation UpdateDepartment($id: ID!, $input: UpdateDepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      id
    }
  }
`

const DELETE_DEPT_M = /* GraphQL */ `
  mutation DeleteDepartment($id: ID!) {
    deleteDepartment(id: $id)
  }
`

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const r = await gqlRequest<{ departments: Department[] }>(DEPARTMENTS_Q)
      return r.departments
    },
  })
}

type CreateDeptInput = { name: string; code?: string; parentId?: string }
type UpdateDeptInput = {
  name?: string
  code?: string
  parentId?: string
  status?: string
}

export function useCreateDepartment(
  opts?: UseMutationOptions<unknown, Error, CreateDeptInput, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (input: CreateDeptInput) =>
      gqlRequest(CREATE_DEPT_M, { input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["departments"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useUpdateDepartment(
  opts?: UseMutationOptions<unknown, Error, { id: string; input: UpdateDeptInput }, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ id, input }) => gqlRequest(UPDATE_DEPT_M, { id, input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["departments"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useDeleteDepartment(
  opts?: UseMutationOptions<unknown, Error, string, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (id: string) => gqlRequest(DELETE_DEPT_M, { id }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["departments"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

// ---------- Designations ----------

const DESIGNATIONS_Q = /* GraphQL */ `
  query Designations {
    designations {
      id
      title
      level
      departmentId
      status
      createdAt
      updatedAt
    }
  }
`

const CREATE_DESIG_M = /* GraphQL */ `
  mutation CreateDesignation($input: CreateDesignationInput!) {
    createDesignation(input: $input) {
      id
    }
  }
`

const UPDATE_DESIG_M = /* GraphQL */ `
  mutation UpdateDesignation($id: ID!, $input: UpdateDesignationInput!) {
    updateDesignation(id: $id, input: $input) {
      id
    }
  }
`

const DELETE_DESIG_M = /* GraphQL */ `
  mutation DeleteDesignation($id: ID!) {
    deleteDesignation(id: $id)
  }
`

export function useDesignations() {
  return useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const r = await gqlRequest<{ designations: Designation[] }>(DESIGNATIONS_Q)
      return r.designations
    },
  })
}

type CreateDesigInput = {
  title: string
  level?: number
  departmentId?: string
}
type UpdateDesigInput = {
  title?: string
  level?: number
  departmentId?: string
  status?: string
}

export function useCreateDesignation(
  opts?: UseMutationOptions<unknown, Error, CreateDesigInput, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (input: CreateDesigInput) =>
      gqlRequest(CREATE_DESIG_M, { input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["designations"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useUpdateDesignation(
  opts?: UseMutationOptions<
    unknown,
    Error,
    { id: string; input: UpdateDesigInput },
    unknown
  >,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ id, input }) => gqlRequest(UPDATE_DESIG_M, { id, input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["designations"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useDeleteDesignation(
  opts?: UseMutationOptions<unknown, Error, string, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (id: string) => gqlRequest(DELETE_DESIG_M, { id }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["designations"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

// ---------- Locations ----------

const LOCATIONS_Q = /* GraphQL */ `
  query Locations {
    locations {
      id
      name
      addressLine1
      addressLine2
      countryId
      stateId
      cityId
      pincode
      timezone
      status
      createdAt
      updatedAt
    }
  }
`

const CREATE_LOC_M = /* GraphQL */ `
  mutation CreateLocation($input: CreateLocationInput!) {
    createLocation(input: $input) {
      id
    }
  }
`

const UPDATE_LOC_M = /* GraphQL */ `
  mutation UpdateLocation($id: ID!, $input: UpdateLocationInput!) {
    updateLocation(id: $id, input: $input) {
      id
    }
  }
`

const DELETE_LOC_M = /* GraphQL */ `
  mutation DeleteLocation($id: ID!) {
    deleteLocation(id: $id)
  }
`

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const r = await gqlRequest<{ locations: Location[] }>(LOCATIONS_Q)
      return r.locations
    },
  })
}

export type CreateLocInput = {
  name: string
  addressLine1?: string
  addressLine2?: string
  countryId?: string
  stateId?: string
  cityId?: string
  pincode?: string
  timezone?: string
}
export type UpdateLocInput = Partial<CreateLocInput> & { status?: string }

export function useCreateLocation(
  opts?: UseMutationOptions<unknown, Error, CreateLocInput, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (input: CreateLocInput) =>
      gqlRequest(CREATE_LOC_M, { input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["locations"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useUpdateLocation(
  opts?: UseMutationOptions<
    unknown,
    Error,
    { id: string; input: UpdateLocInput },
    unknown
  >,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ id, input }) => gqlRequest(UPDATE_LOC_M, { id, input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["locations"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useDeleteLocation(
  opts?: UseMutationOptions<unknown, Error, string, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (id: string) => gqlRequest(DELETE_LOC_M, { id }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["locations"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

// ---------- Geography (read-only) ----------

const COUNTRIES_Q = /* GraphQL */ `
  query Countries {
    countries {
      id
      name
      isoCode
    }
  }
`

const STATES_Q = /* GraphQL */ `
  query States($countryId: ID!) {
    states(countryId: $countryId) {
      id
      name
      countryId
    }
  }
`

const CITIES_Q = /* GraphQL */ `
  query Cities($stateId: ID!) {
    cities(stateId: $stateId) {
      id
      name
      stateId
    }
  }
`

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    staleTime: 24 * 60 * 60 * 1000, // catalog changes rarely; cache for a day
    queryFn: async () => {
      const r = await gqlRequest<{ countries: Country[] }>(COUNTRIES_Q)
      return r.countries
    },
  })
}

export function useStates(countryId: string | null | undefined) {
  return useQuery({
    queryKey: ["states", countryId],
    enabled: !!countryId,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const r = await gqlRequest<{ states: State[] }>(STATES_Q, {
        countryId,
      })
      return r.states
    },
  })
}

export function useCities(stateId: string | null | undefined) {
  return useQuery({
    queryKey: ["cities", stateId],
    enabled: !!stateId,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const r = await gqlRequest<{ cities: City[] }>(CITIES_Q, { stateId })
      return r.cities
    },
  })
}
