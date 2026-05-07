"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useCreateEmployee } from "@/lib/employees"
import { EmployeeForm } from "@/components/employees/employee-form"

export default function NewEmployeePage() {
  const router = useRouter()
  const create = useCreateEmployee({
    onSuccess: () => {
      toast.success("Employee created")
      router.push("/employees")
    },
    onError: (err) => {
      toast.error("Failed to create employee", { description: err.message })
    },
  })

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Add employee
        </h1>
        <p className="text-sm text-muted-foreground">
          Fill in the details to create a new employee record.
        </p>
      </div>

      <EmployeeForm
        submitting={create.isPending}
        error={(create.error as Error) ?? null}
        onSubmit={(input) => create.mutate(input)}
        onCancel={() => router.back()}
      />
    </div>
  )
}
