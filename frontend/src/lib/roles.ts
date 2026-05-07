"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query"
import { gqlRequest } from "./graphql"

// ---------- Types ----------

export type RolePermission = {
  id: string
  key: string
  description: string | null
}

export type Role = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  status: string
  permissions: RolePermission[]
  userCount: number
  createdAt: number
}

export type UserRole = {
  userId: string
  roleId: string
  roleName: string
}

// ---------- Queries ----------

const ROLES_Q = /* GraphQL */ `
  query Roles {
    roles {
      id name description isSystem status userCount createdAt
      permissions { id key description }
    }
  }
`

const ROLE_Q = /* GraphQL */ `
  query Role($id: ID!) {
    role(id: $id) {
      id name description isSystem status userCount createdAt
      permissions { id key description }
    }
  }
`

const PERMISSIONS_Q = /* GraphQL */ `
  query AllPermissions {
    allPermissions { id key description }
  }
`

const USER_ROLES_Q = /* GraphQL */ `
  query UserRoles($userId: ID!) {
    userRoles(userId: $userId) { userId roleId roleName }
  }
`

const CREATE_ROLE_M = /* GraphQL */ `
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) { id }
  }
`

const UPDATE_ROLE_M = /* GraphQL */ `
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) { id }
  }
`

const DELETE_ROLE_M = /* GraphQL */ `
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`

export type RoleUser = {
  userId: string
  email: string
}

const USERS_WITH_ROLE_Q = /* GraphQL */ `
  query UsersWithRole($roleId: ID!) {
    usersWithRole(roleId: $roleId) { userId email }
  }
`

const SET_PERMS_M = /* GraphQL */ `
  mutation SetRolePermissions($roleId: ID!, $permissionIds: [ID!]!) {
    setRolePermissions(roleId: $roleId, permissionIds: $permissionIds) { id }
  }
`

const ASSIGN_ROLE_M = /* GraphQL */ `
  mutation AssignRole($userId: ID!, $roleId: ID!) {
    assignRole(userId: $userId, roleId: $roleId)
  }
`

const REVOKE_ROLE_M = /* GraphQL */ `
  mutation RevokeRole($userId: ID!, $roleId: ID!) {
    revokeRole(userId: $userId, roleId: $roleId)
  }
`

// ---------- Hooks ----------

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const r = await gqlRequest<{ roles: Role[] }>(ROLES_Q)
      return r.roles
    },
  })
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: ["role", id],
    enabled: !!id,
    queryFn: async () => {
      const r = await gqlRequest<{ role: Role | null }>(ROLE_Q, { id })
      return r.role
    },
  })
}

export function useUsersWithRole(roleId: string | undefined) {
  return useQuery({
    queryKey: ["usersWithRole", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const r = await gqlRequest<{ usersWithRole: RoleUser[] }>(USERS_WITH_ROLE_Q, { roleId })
      return r.usersWithRole
    },
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const r = await gqlRequest<{ allPermissions: RolePermission[] }>(PERMISSIONS_Q)
      return r.allPermissions
    },
  })
}

export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["userRoles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const r = await gqlRequest<{ userRoles: UserRole[] }>(USER_ROLES_Q, { userId })
      return r.userRoles
    },
  })
}

type CreateRoleInput = { name: string; description?: string; permissionIds: string[] }

export function useCreateRole(
  opts?: UseMutationOptions<unknown, Error, CreateRoleInput, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (input: CreateRoleInput) => gqlRequest(CREATE_ROLE_M, { input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

type UpdateRoleInput = { name?: string; description?: string; status?: string }

export function useUpdateRole(
  opts?: UseMutationOptions<unknown, Error, { id: string; input: UpdateRoleInput }, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ id, input }) => gqlRequest(UPDATE_ROLE_M, { id, input }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      qc.invalidateQueries({ queryKey: ["role"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useDeleteRole(
  opts?: UseMutationOptions<unknown, Error, string, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: (id: string) => gqlRequest(DELETE_ROLE_M, { id }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useSetRolePermissions(
  opts?: UseMutationOptions<unknown, Error, { roleId: string; permissionIds: string[] }, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ roleId, permissionIds }) => gqlRequest(SET_PERMS_M, { roleId, permissionIds }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["roles"] })
      qc.invalidateQueries({ queryKey: ["role"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useAssignRole(
  opts?: UseMutationOptions<unknown, Error, { userId: string; roleId: string }, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ userId, roleId }) => gqlRequest(ASSIGN_ROLE_M, { userId, roleId }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["userRoles"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}

export function useRevokeRole(
  opts?: UseMutationOptions<unknown, Error, { userId: string; roleId: string }, unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    ...opts,
    mutationFn: ({ userId, roleId }) => gqlRequest(REVOKE_ROLE_M, { userId, roleId }),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: ["userRoles"] })
      ;(opts?.onSuccess as ((...a: typeof args) => void) | undefined)?.(...args)
    },
  })
}
