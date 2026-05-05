"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "lucide-react"
import {
  Designation,
  useCreateDesignation,
  useDeleteDesignation,
  useDepartments,
  useDesignations,
  useUpdateDesignation,
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

export default function DesignationsPage() {
  const q = useDesignations()
  const dq = useDepartments()
  const [filterDept, setFilterDept] = useState<string>("")
  const [editing, setEditing] = useState<Designation | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Designation | null>(null)
  const del = useDeleteDesignation({ onSuccess: () => setConfirmDelete(null) })

  const deptName = (id: string | null) =>
    id ? (dq.data?.find((d) => d.id === id)?.name ?? "—") : "—"

  const filtered = useMemo(() => {
    if (!q.data) return []
    if (!filterDept) return q.data
    return q.data.filter((d) => d.departmentId === filterDept)
  }, [q.data, filterDept])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-64">
          <Select
            aria-label="Filter by department"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">All departments</option>
            {dq.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-4 w-4" />
            New designation
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {q.isLoading ? (
          <div className="p-6 text-sm text-slate-600">Loading…</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-red-600">
            {(q.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            No designations match this view.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-24 px-4 py-3 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {deptName(d.departmentId)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.level ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={d.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => setEditing(d)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Archive"
                        onClick={() => setConfirmDelete(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <DesignationForm mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <DesignationForm
          mode="edit"
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader
              title="Archive designation?"
              description={`"${confirmDelete.title}" will be marked as deleted. Soft-delete only — audit history is preserved.`}
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

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "inactive"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700"
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  )
}

const formSchema = z.object({
  title: z.string().min(1, "Required"),
  level: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(99)])
    .optional(),
  departmentId: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

function DesignationForm({
  mode,
  existing,
  onClose,
}: {
  mode: "create" | "edit"
  existing?: Designation
  onClose: () => void
}) {
  const dq = useDepartments()
  const create = useCreateDesignation({ onSuccess: onClose })
  const update = useUpdateDesignation({ onSuccess: onClose })
  const submitting = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: existing?.title ?? "",
      level: (existing?.level ?? "") as FormValues["level"],
      departmentId: existing?.departmentId ?? "",
    },
  })

  const onSubmit = (v: FormValues) => {
    const cleaned: {
      title: string
      level?: number
      departmentId?: string
    } = {
      title: v.title,
    }
    if (typeof v.level === "number") cleaned.level = v.level
    if (v.departmentId) cleaned.departmentId = v.departmentId

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
          title={mode === "create" ? "New designation" : "Edit designation"}
          description={
            mode === "create"
              ? "Add a job title to the directory."
              : `Editing "${existing?.title}".`
          }
          onClose={onClose}
        />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title")} />
                {errors.title && (
                  <p className="text-xs text-red-600">{errors.title.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="level">Level (optional)</Label>
                  <Input
                    id="level"
                    type="number"
                    min={0}
                    max={99}
                    {...register("level")}
                  />
                  {errors.level && (
                    <p className="text-xs text-red-600">
                      {errors.level.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="departmentId">Department (optional)</Label>
                  <Select id="departmentId" {...register("departmentId")}>
                    <option value="">None</option>
                    {dq.data
                      ?.filter((d) => d.status === "active")
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </Select>
                </div>
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
