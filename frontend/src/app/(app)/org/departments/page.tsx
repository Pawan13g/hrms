"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Department,
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from "@/lib/org"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ---------------- Tree shaping ----------------

type TreeNode = Department & { children: TreeNode[] }

function buildTree(items: Department[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  items.forEach((d) => byId.set(d.id, { ...d, children: [] }))
  const roots: TreeNode[] = []
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function descendantIds(node: TreeNode): string[] {
  const out = [node.id]
  for (const child of node.children) out.push(...descendantIds(child))
  return out
}

function findNode(roots: TreeNode[], id: string): TreeNode | null {
  for (const r of roots) {
    if (r.id === id) return r
    const inChild = findNode(r.children, id)
    if (inChild) return inChild
  }
  return null
}

// ---------------- Page ----------------

export default function DepartmentsPage() {
  const q = useDepartments()
  const [editing, setEditing] = useState<Department | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null)
  const del = useDeleteDepartment({
    onSuccess: () => { toast.success("Department archived"); setConfirmDelete(null) },
    onError: (err) => { toast.error("Archive failed", { description: (err as Error).message }) },
  })

  const tree = useMemo(() => buildTree(q.data ?? []), [q.data])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" />
          New department
        </Button>
      </div>

      <Card>
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-destructive">
            {(q.error as Error).message}
          </div>
        ) : tree.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No departments yet. Create the first one to start the org tree.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tree.map((node) => (
              <DeptRow
                key={node.id}
                node={node}
                depth={0}
                onEdit={setEditing}
                onDelete={setConfirmDelete}
              />
            ))}
          </ul>
        )}
      </Card>

      {creating && (
        <DepartmentForm
          mode="create"
          tree={tree}
          allItems={q.data ?? []}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <DepartmentForm
          mode="edit"
          existing={editing}
          tree={tree}
          allItems={q.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Archive department?</DialogTitle>
              <DialogDescription>
                &ldquo;{confirmDelete.name}&rdquo; will be marked as deleted and
                hidden from the org tree. This is a soft-delete — the row stays
                in the database for audit history.
              </DialogDescription>
            </DialogHeader>
            {del.error && (
              <p className="px-6 text-sm text-destructive">
                {(del.error as Error).message}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={del.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => del.mutate(confirmDelete.id)}
                disabled={del.isPending}
              >
                {del.isPending ? "Archiving..." : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function DeptRow({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: TreeNode
  depth: number
  onEdit: (d: Department) => void
  onDelete: (d: Department) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  return (
    <>
      <li
        className="group flex items-center gap-2 px-4 py-3 hover:bg-accent"
        style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground",
            !hasChildren && "invisible",
          )}
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
          />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-medium text-foreground">{node.name}</span>
          {node.code && (
            <Badge variant="secondary">{node.code}</Badge>
          )}
          {node.status !== "active" && (
            <Badge variant="warning">{node.status}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit"
            onClick={() => onEdit(node)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Archive"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </li>
      {open &&
        node.children.map((c) => (
          <DeptRow
            key={c.id}
            node={c}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  )
}

// ---------------- Form dialog ----------------

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().max(255).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

function DepartmentForm({
  mode,
  existing,
  tree,
  allItems,
  onClose,
}: {
  mode: "create" | "edit"
  existing?: Department
  tree: TreeNode[]
  allItems: Department[]
  onClose: () => void
}) {
  const create = useCreateDepartment({
    onSuccess: () => { toast.success(mode === "create" ? "Department created" : "Department updated"); onClose() },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })
  const update = useUpdateDepartment({
    onSuccess: () => { toast.success("Department updated"); onClose() },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })
  const submitting = create.isPending || update.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existing?.name ?? "",
      code: existing?.code ?? "",
      parentId: existing?.parentId ?? "",
    },
  })

  const excluded = useMemo(() => {
    if (mode !== "edit" || !existing) return new Set<string>()
    const node = findNode(tree, existing.id)
    return node ? new Set(descendantIds(node)) : new Set<string>()
  }, [mode, existing, tree])

  const parentOptions = allItems.filter(
    (d) => d.status === "active" && !excluded.has(d.id),
  )

  const onSubmit = (v: FormValues) => {
    const cleaned = {
      name: v.name,
      code: v.code?.trim() ? v.code.trim() : undefined,
      parentId: v.parentId?.trim() ? v.parentId.trim() : undefined,
    }
    if (mode === "create") {
      create.mutate(cleaned)
    } else if (existing) {
      update.mutate({ id: existing.id, input: cleaned })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New department" : "Edit department"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a node to the org tree."
              : `Editing "${existing?.name}".`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogBody>
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (optional)</FormLabel>
                    <FormControl><Input placeholder="ENG" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="parentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent (optional)</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="No parent (root)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No parent (root)</SelectItem>
                        {parentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
