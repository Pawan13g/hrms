"use client"

import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useEmployee, useUpdateEmployee } from "@/lib/employees"
import { EmployeeForm } from "@/components/employees/employee-form"

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const q = useEmployee(id)

  const update = useUpdateEmployee({
    onSuccess: () => {
      toast.success("Employee updated")
      router.push(`/employees/${id}`)
    },
    onError: (err) => {
      toast.error("Failed to update employee", { description: err.message })
    },
  })

  if (q.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  }
  if (q.error) {
    return (
      <div className="p-6 text-sm text-destructive">
        {(q.error as Error).message}
      </div>
    )
  }
  if (!q.data) {
    return <div className="p-6 text-sm text-muted-foreground">Employee not found.</div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit employee
        </h1>
        <p className="text-sm text-muted-foreground">
          Update {q.data.firstName || q.data.employeeCode}&apos;s record.
        </p>
      </div>

      <EmployeeForm
        existing={q.data}
        submitting={update.isPending}
        error={(update.error as Error) ?? null}
        onSubmit={(input) => update.mutate({ id, input })}
        onCancel={() => router.back()}
      />
    </div>
  )
}
