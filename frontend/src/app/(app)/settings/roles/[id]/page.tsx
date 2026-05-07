"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Lock, Mail, Pencil, Save, Trash2, UserMinus } from "lucide-react"
import { toast } from "sonner"
import {
  useRole,
  usePermissions,
  useSetRolePermissions,
  useDeleteRole,
  useUsersWithRole,
  useRevokeRole,
} from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const q = useRole(id)
  const permsQ = usePermissions()
  const usersQ = useUsersWithRole(id)
  const role = q.data

  const [selectedPerms, setSelectedPerms] = useState<string[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const setPerms = useSetRolePermissions({
    onSuccess: () => {
      toast.success("Permissions updated")
      toast.info("Changes take effect on next login", { duration: 5000 })
      setSelectedPerms(null)
    },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })

  const del = useDeleteRole({
    onSuccess: () => { toast.success("Role archived"); router.push("/settings/roles") },
    onError: (err) => { toast.error("Archive failed", { description: err.message }) },
  })

  const revoke = useRevokeRole({
    onSuccess: () => { toast.success("User removed from role") },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (q.error) return <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
  if (!role) return <div className="p-6 text-sm text-muted-foreground">Role not found.</div>

  const currentPermIds = selectedPerms ?? role.permissions.map((p) => p.id)
  const allPerms = permsQ.data ?? []
  const groups = allPerms.reduce<Record<string, typeof allPerms>>((acc, p) => {
    const domain = p.key.split(".")[0]
    ;(acc[domain] ??= []).push(p)
    return acc
  }, {})

  const dirty = selectedPerms !== null
  const users = usersQ.data ?? []

  const toggle = (permId: string, checked: boolean) => {
    const base = selectedPerms ?? role.permissions.map((p) => p.id)
    const next = checked ? [...base, permId] : base.filter((pid) => pid !== permId)
    setSelectedPerms(next)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">{role.name}</h2>
              {role.isSystem && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" /> System
                </Badge>
              )}
              <Badge variant={role.status === "active" ? "success" : "warning"} className="capitalize">
                {role.status}
              </Badge>
            </div>
            {role.description && (
              <p className="text-sm text-muted-foreground">{role.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!role.isSystem && (
            <>
              <Link href={`/settings/roles/${id}/edit`}>
                <Button variant="secondary" size="sm">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Permissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Permissions ({currentPermIds.length})
          </CardTitle>
          {dirty && (
            <Button
              size="sm"
              onClick={() => setPerms.mutate({ roleId: id, permissionIds: currentPermIds })}
              disabled={setPerms.isPending}
            >
              <Save className="h-4 w-4" />
              {setPerms.isPending ? "Saving..." : "Save changes"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {permsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([domain, items]) => (
                <div key={domain} className="space-y-3">
                  <h3 className="text-sm font-semibold capitalize">{domain}</h3>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <label key={p.id} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={currentPermIds.includes(p.id)}
                          onCheckedChange={(checked) => toggle(p.id, !!checked)}
                        />
                        <div className="leading-none">
                          <span className="text-sm font-normal">{p.key}</span>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Assigned Users ({users.length})
          </CardTitle>
        </CardHeader>
        {users.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No users assigned to this role.
            </p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4 text-xs uppercase tracking-wide">User ID</TableHead>
                  <TableHead className="px-4 text-xs uppercase tracking-wide">Email</TableHead>
                  <TableHead className="w-20 px-4" aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId} className="group">
                    <TableCell className="px-4 font-mono text-sm text-muted-foreground">
                      {u.userId}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove from role"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => revoke.mutate({ userId: u.userId, roleId: id })}
                        disabled={revoke.isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Archive role?</DialogTitle>
              <DialogDescription>
                &ldquo;{role.name}&rdquo; will be marked as deleted. Users with
                this role will lose its permissions on their next login.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={del.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => del.mutate(id)} disabled={del.isPending}>
                {del.isPending ? "Archiving..." : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
