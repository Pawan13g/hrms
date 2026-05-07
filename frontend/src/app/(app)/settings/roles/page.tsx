"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRoles, useDeleteRole } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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

export default function RolesPage() {
  const q = useRoles()
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const del = useDeleteRole({
    onSuccess: () => { toast.success("Role archived"); setConfirmDelete(null) },
    onError: (err) => { toast.error("Archive failed", { description: err.message }) },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href="/settings/roles/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New role
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No roles found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 text-xs uppercase tracking-wide">Name</TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">Description</TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">Permissions</TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">Users</TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="w-24 px-4" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data!.map((r) => (
                <TableRow key={r.id} className="group">
                  <TableCell className="px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {r.isSystem && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> System
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {r.description || "\u2014"}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {r.permissions.length}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {r.userCount}
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge
                      variant={r.status === "active" ? "success" : "warning"}
                      className="capitalize"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Link href={`/settings/roles/${r.id}`}>
                        <Button variant="ghost" size="icon" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {!r.isSystem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Archive"
                          onClick={() => setConfirmDelete({ id: r.id, name: r.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Archive role?</DialogTitle>
              <DialogDescription>
                &ldquo;{confirmDelete.name}&rdquo; will be marked as deleted. Users with
                this role will lose its permissions on their next login.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={del.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => del.mutate(confirmDelete.id)} disabled={del.isPending}>
                {del.isPending ? "Archiving..." : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
