"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query"
import { gqlRequest } from "./graphql"

// ---------- Types ----------

export type Employee = {
  id: string
  employeeCode: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  gender: string | null
  joiningDate: string
  employmentType: string | null
  departmentId: string | null
  designationId: string | null
  locationId: string | null
  managerId: string | null
  userId: string | null
  status: string
  createdAt: number
  updatedAt: number
}

export type PageInfo = {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export type EmployeeEdge = {
  cursor: string
  node: Employee
}

export type EmployeeConnection = {
  edges: EmployeeEdge[]
  pageInfo: PageInfo
  totalCount: number
}

export type EmployeeFilter = {
  search?: string
  status?: string
  departmentId?: string
  designationId?: string
  locationId?: string
  managerId?: string
}

export type EmployeeSort =
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "NAME_ASC"
  | "NAME_DESC"
  | "JOINING_DESC"
  | "JOINING_ASC"

export type CreateEmployeeInput = {
  employeeCode: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  joiningDate: string
  employmentType?: string
  departmentId?: string
  designationId?: string
  locationId?: string
  managerId?: string
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  status?: string
}

// ---------- Queries ----------

const EMPLOYEES_Q = /* GraphQL */ `
  query Employees($first: Int, $after: String, $filter: EmployeeFilter, $sort: EmployeeSort) {
    employees(first: $first, after: $after, filter: $filter, sort: $sort) {
      edges {
        cursor
        node {
          id
          employeeCode
          firstName
          lastName
          email
          phone
          dateOfBirth
          gender
          joiningDate
          employmentType
          departmentId
          designationId
          locationId
          managerId
          userId
          status
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

const EMPLOYEE_Q = /* GraphQL */ `
  query Employee($id: ID!) {
    employee(id: $id) {
      id
      employeeCode
      firstName
      lastName
      email
      phone
      dateOfBirth
      gender
      joiningDate
      employmentType
      departmentId
      designationId
      locationId
      managerId
      userId
      status
      createdAt
      updatedAt
    }
  }
`

const CREATE_EMP_M = /* GraphQL */ `
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
    }
  }
`

const UPDATE_EMP_M = /* GraphQL */ `
  mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      id
    }
  }
`

const DELETE_EMP_M = /* GraphQL */ `
  mutation DeleteEmployee($id: ID!) {
    deleteEmployee(id: $id)
  }
`

// ---------- Hooks ----------

export function useEmployees(vars: {
  first?: number
  after?: string
  filter?: EmployeeFilter
  sort?: EmployeeSort
}) {
  return useQuery({
    queryKey: ["employees", vars],
    queryFn: async () => {
      const r = await gqlRequest<{ employees: EmployeeConnection }>(
        EMPLOYEES_Q,
        vars,
      )
      return r.employees
    },
  })
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async () => {
      const r = await gqlRequest<{ employee: Employee | null }>(EMPLOYEE_Q, {
        id,
      })
      return r.employee
    },
  })
}

export function useCreateEmployee(
  opts?: UseMutationOptions<unknown, Error, CreateEmployeeInput, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (input: CreateEmployeeInput) =>
      gqlRequest(CREATE_EMP_M, { input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["employees"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useUpdateEmployee(
  opts?: UseMutationOptions<
    unknown,
    Error,
    { id: string; input: UpdateEmployeeInput },
    unknown
  >,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ id, input }) => gqlRequest(UPDATE_EMP_M, { id, input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["employees"] })
      qc.invalidateQueries({ queryKey: ["employee"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useDeleteEmployee(
  opts?: UseMutationOptions<unknown, Error, string, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (id: string) => gqlRequest(DELETE_EMP_M, { id }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["employees"] })
      qc.invalidateQueries({ queryKey: ["employee"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

// ---------- Helpers ----------

export function employeeName(e: Employee): string {
  const parts = [e.firstName, e.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : e.employeeCode
}

export function formatDate(unix: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(unix * 1000))
}
