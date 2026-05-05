"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
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
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ---------------- Tree shaping ----------------

type TreeNode = Department & { children: TreeNode[] }

// buildTree groups departments by parent_id so the page can render the
// hierarchy with WITH-RECURSIVE-style fan-out without a server round-trip
// per node. Cycles are impossible (the backend service rejects them on
// every parent change), so we don't guard against them here.
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

// descendantIds collects every id in the subtree rooted at a node — used
// when building the parent-picker option list to exclude self+descendants
// (the backend's IsDescendant guard mirrors this; we filter client-side
// purely for UX so the user can't pick a doomed option).
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
    onSuccess: () => setConfirmDelete(null),
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {q.isLoading ? (
          <div className="p-6 text-sm text-slate-600">Loading…</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-red-600">
            {(q.error as Error).message}
          </div>
        ) : tree.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            No departments yet. Create the first one to start the org tree.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
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
      </div>

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
            <DialogHeader
              title="Archive department?"
              description={`"${confirmDelete.name}" will be marked as deleted and hidden from the org tree. This is a soft-delete — the row stays in the database for audit history.`}
              onClose={() => setConfirmDelete(null)}
            />
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
                {del.isPending ? "Archiving…" : "Archive"}
              </Button>
            </DialogFooter>
            {del.error && (
              <p className="px-6 pb-4 text-sm text-red-600">
                {(del.error as Error).message}
              </p>
            )}
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
        className="group flex items-center gap-2 px-4 py-3 hover:bg-slate-50"
        style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700",
            !hasChildren && "invisible",
          )}
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
          />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-medium text-slate-900">{node.name}</span>
          {node.code && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {node.code}
            </span>
          )}
          {node.status !== "active" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {node.status}
            </span>
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
  const create = useCreateDepartment({ onSuccess: onClose })
  const update = useUpdateDepartment({ onSuccess: onClose })
  const submitting = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existing?.name ?? "",
      code: existing?.code ?? "",
      parentId: existing?.parentId ?? "",
    },
  })

  // For edit mode, exclude self + descendants from the parent list to mirror
  // the backend's cycle-safe IsDescendant check.
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

  const err = (create.error ?? update.error) as Error | null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader
          title={mode === "create" ? "New department" : "Edit department"}
          description={
            mode === "create"
              ? "Add a node to the org tree."
              : `Editing "${existing?.name}".`
          }
          onClose={onClose}
        />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">Code (optional)</Label>
                <Input id="code" placeholder="ENG" {...register("code")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="parentId">Parent (optional)</Label>
                <Select id="parentId" {...register("parentId")}>
                  <option value="">No parent (root)</option>
                  {parentOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              {err && <p className="text-sm text-red-600">{err.message}</p>}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Create"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
