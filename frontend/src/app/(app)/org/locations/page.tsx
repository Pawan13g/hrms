"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const del = useDeleteLocation({ onSuccess: () => setConfirmDelete(null) })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" />
          New location
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {q.isLoading ? (
          <div className="p-6 text-sm text-slate-600">Loading…</div>
        ) : q.error ? (
          <div className="p-6 text-sm text-red-600">
            {(q.error as Error).message}
          </div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            No locations yet. Create one to start adding employees.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Timezone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th
                  className="w-24 px-4 py-3 font-medium"
                  aria-label="Actions"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data!.map((l) => (
                <tr key={l.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {l.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[l.addressLine1, l.addressLine2, l.pincode]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.timezone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={l.status} />
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
            <DialogHeader
              title="Archive location?"
              description={`"${confirmDelete.name}" will be marked as deleted. Soft-delete only — historical employee records keep their reference.`}
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
  const create = useCreateLocation({ onSuccess: onClose })
  const update = useUpdateLocation({ onSuccess: onClose })
  const submitting = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
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

  const err = (create.error ?? update.error) as Error | null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader
          title={mode === "create" ? "New location" : "Edit location"}
          description={
            mode === "create"
              ? "Add a physical office or hub."
              : `Editing "${existing?.name}".`
          }
          onClose={onClose}
        />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Acme HQ"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="addressLine1">Address line 1</Label>
                <Input id="addressLine1" {...register("addressLine1")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addressLine2">Address line 2</Label>
                <Input id="addressLine2" {...register("addressLine2")} />
              </div>

              <Controller
                control={control}
                name="geo"
                render={({ field }) => (
                  <GeographyPicker
                    value={field.value as GeographyValue}
                    onChange={field.onChange}
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" {...register("pincode")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Controller
                    control={control}
                    name="timezone"
                    render={({ field }) => (
                      <TimezonePicker
                        id="timezone"
                        value={field.value as string | null}
                        onChange={(v) => field.onChange(v ?? "")}
                      />
                    )}
                  />
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
