"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  CreateLocInput,
  Location,
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
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
  GeographyPicker,
  type GeographyValue,
} from "@/components/geography/geography-picker"
import { TimezonePicker } from "@/components/geography/timezone-picker"

export default function LocationsPage() {
  const q = useLocations()
  const [editing, setEditing] = useState<Location | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null)
  const del = useDeleteLocation({
    onSuccess: () => { toast.success("Location archived"); setConfirmDelete(null) },
    onError: (err) => { toast.error("Archive failed", { description: (err as Error).message }) },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" />
          New location
        </Button>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-destructive">
            {(q.error as Error).message}
          </div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No locations yet. Create one to start adding employees.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Name
                </TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Address
                </TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Timezone
                </TableHead>
                <TableHead className="px-4 text-xs uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="w-24 px-4" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data!.map((l) => (
                <TableRow key={l.id} className="group">
                  <TableCell className="px-4 font-medium text-foreground">
                    {l.name}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {[l.addressLine1, l.addressLine2, l.pincode]
                      .filter(Boolean)
                      .join(", ") || "\u2014"}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {l.timezone ?? "\u2014"}
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => setEditing(l)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Archive"
                        onClick={() => setConfirmDelete(l)}
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
        <LocationForm mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <LocationForm
          mode="edit"
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Archive location?</DialogTitle>
              <DialogDescription>
                &ldquo;{confirmDelete.name}&rdquo; will be marked as deleted.
                Soft-delete only — historical employee records keep their reference.
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
  name: z.string().min(1, "Required"),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
  geo: z.object({
    countryId: z.string().nullable().optional(),
    stateId: z.string().nullable().optional(),
    cityId: z.string().nullable().optional(),
  }),
})

type FormValues = z.infer<typeof formSchema>

function LocationForm({
  mode,
  existing,
  onClose,
}: {
  mode: "create" | "edit"
  existing?: Location
  onClose: () => void
}) {
  const create = useCreateLocation({
    onSuccess: () => { toast.success(mode === "create" ? "Location created" : "Location updated"); onClose() },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })
  const update = useUpdateLocation({
    onSuccess: () => { toast.success("Location updated"); onClose() },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })
  const submitting = create.isPending || update.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existing?.name ?? "",
      addressLine1: existing?.addressLine1 ?? "",
      addressLine2: existing?.addressLine2 ?? "",
      pincode: existing?.pincode ?? "",
      timezone: existing?.timezone ?? "",
      geo: {
        countryId: existing?.countryId ?? null,
        stateId: existing?.stateId ?? null,
        cityId: existing?.cityId ?? null,
      },
    },
  })

  const onSubmit = (v: FormValues) => {
    const input: CreateLocInput = {
      name: v.name,
      addressLine1: v.addressLine1?.trim() || undefined,
      addressLine2: v.addressLine2?.trim() || undefined,
      pincode: v.pincode?.trim() || undefined,
      timezone: v.timezone?.trim() || undefined,
      countryId: v.geo.countryId ?? undefined,
      stateId: v.geo.stateId ?? undefined,
      cityId: v.geo.cityId ?? undefined,
    }
    if (mode === "create") {
      create.mutate(input)
    } else if (existing) {
      update.mutate({ id: existing.id, input })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New location" : "Edit location"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a physical office or hub."
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
                    <FormControl><Input placeholder="Acme HQ" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="addressLine1" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 1</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="addressLine2" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 2</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />

                <Controller
                  control={form.control}
                  name="geo"
                  render={({ field }) => (
                    <GeographyPicker
                      value={field.value as GeographyValue}
                      onChange={field.onChange}
                    />
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="pincode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <TimezonePicker
                        value={field.value as string | null}
                        onChange={(v) => field.onChange(v ?? "")}
                      />
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
