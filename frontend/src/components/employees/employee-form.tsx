"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDepartments, useDesignations, useLocations } from "@/lib/org"
import {
  useEmployees,
  type CreateEmployeeInput,
  type Employee,
} from "@/lib/employees"

const schema = z.object({
  employeeCode: z.string().min(1, "Required"),
  firstName: z.string().optional().or(z.literal("")),
  lastName: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  phone: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  joiningDate: z.string().min(1, "Required"),
  employmentType: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  designationId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

function toInput(v: FormValues): CreateEmployeeInput {
  return {
    employeeCode: v.employeeCode,
    firstName: v.firstName?.trim() || undefined,
    lastName: v.lastName?.trim() || undefined,
    email: v.email?.trim() || undefined,
    phone: v.phone?.trim() || undefined,
    dateOfBirth: v.dateOfBirth?.trim() || undefined,
    gender: v.gender?.trim() || undefined,
    joiningDate: v.joiningDate,
    employmentType: v.employmentType?.trim() || undefined,
    departmentId: v.departmentId?.trim() || undefined,
    designationId: v.designationId?.trim() || undefined,
    locationId: v.locationId?.trim() || undefined,
    managerId: v.managerId?.trim() || undefined,
  }
}

function FormSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string | undefined
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger className="h-10">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function EmployeeForm({
  existing,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  existing?: Employee
  submitting: boolean
  error: Error | null
  onSubmit: (input: CreateEmployeeInput) => void
  onCancel: () => void
}) {
  const depts = useDepartments()
  const desigs = useDesignations()
  const locs = useLocations()
  const empQ = useEmployees({ first: 200 })

  const today = new Date().toISOString().split("T")[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeCode: existing?.employeeCode ?? "",
      firstName: existing?.firstName ?? "",
      lastName: existing?.lastName ?? "",
      email: existing?.email ?? "",
      phone: existing?.phone ?? "",
      dateOfBirth: existing?.dateOfBirth ?? "",
      gender: existing?.gender ?? "",
      joiningDate: existing?.joiningDate ?? today,
      employmentType: existing?.employmentType ?? "",
      departmentId: existing?.departmentId ?? "",
      designationId: existing?.designationId ?? "",
      locationId: existing?.locationId ?? "",
      managerId: existing?.managerId ?? "",
    },
  })

  const managerOptions = (empQ.data?.edges ?? [])
    .map((e) => e.node)
    .filter((e) => e.status === "active" && e.id !== existing?.id)

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((v) => onSubmit(toInput(v)))}
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="employeeCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Code</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="jane@acme.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input type="tel" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select"
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="joiningDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Joining Date</FormLabel>
                  <FormControl><Input type="date" max={today} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="employmentType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Type</FormLabel>
                  <FormSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select"
                    options={[
                      { value: "full_time", label: "Full Time" },
                      { value: "part_time", label: "Part Time" },
                      { value: "contract", label: "Contract" },
                      { value: "intern", label: "Intern" },
                    ]}
                  />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="departmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select department"
                    options={depts.data?.filter((d) => d.status === "active").map((d) => ({ value: d.id, label: d.name })) ?? []}
                  />
                </FormItem>
              )} />
              <FormField control={form.control} name="designationId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select designation"
                    options={desigs.data?.filter((d) => d.status === "active").map((d) => ({ value: d.id, label: d.title })) ?? []}
                  />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="locationId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select location"
                    options={locs.data?.filter((l) => l.status === "active").map((l) => ({ value: l.id, label: l.name })) ?? []}
                  />
                </FormItem>
              )} />
              <FormField control={form.control} name="managerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager</FormLabel>
                  <FormSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select manager"
                    options={managerOptions.map((e) => ({
                      value: e.id,
                      label: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.employeeCode,
                    }))}
                  />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : existing ? "Save changes" : "Create employee"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
