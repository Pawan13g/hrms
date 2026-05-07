"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function DesignationsPage() {
  const q = useDesignations()
  const dq = useDepartments()
  const [filterDept, setFilterDept] = useState<string>("")
  const [editing, setEditing] = useState<Designation | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Designation | null>(null)
  const del = useDeleteDesignation({
    onSuccess: () => { toast.success("Designation archived"); setConfirmDelete(null) },
    onError: (err) => { toast.error("Archive failed", { description: (err as Error).message }) },
  })

  const deptName = (id: string | null) =>
    id ? (dq.data?.find((d) => d.id === id)?.name ?? "\u2014") : "\u2014"

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
            value={filterDept || "__all__"}
            onValueChange={(v) => setFilterDept(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {dq.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-4 w-4" />
            New designation
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-destructive">
            {(q.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No designations match this view.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Title
                </TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Department
                </TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Level
                </TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="w-24 px-4" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="group">
                  <TableCell className="px-4 font-medium text-foreground">
                    {d.title}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {deptName(d.departmentId)}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {d.level ?? "\u2014"}
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="px-4">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

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
            <DialogHeader>
              <DialogTitle>Archive designation?</DialogTitle>
              <DialogDescription>
                &ldquo;{confirmDelete.title}&rdquo; will be marked as deleted.
                Soft-delete only — audit history is preserved.
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

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "active"
      ? "success"
      : status === "inactive"
        ? "warning"
        : ("secondary" as const)
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
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
  const create = useCreateDesignation({
    onSuccess: () => { toast.success(mode === "create" ? "Designation created" : "Designation updated"); onClose() },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })
  const update = useUpdateDesignation({
    onSuccess: () => { toast.success("Designation updated"); onClose() },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })
  const submitting = create.isPending || update.isPending

  const form = useForm<FormValues>({
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New designation" : "Edit designation"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a job title to the directory."
              : `Editing "${existing?.title}".`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogBody>
              <div className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level (optional)</FormLabel>
                      <FormControl><Input type="number" min={0} max={99} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="departmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department (optional)</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {dq.data
                            ?.filter((d) => d.status === "active")
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
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
