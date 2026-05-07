"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, UserCircle } from "lucide-react"
import {
  useEmployees,
  employeeName,
  type Employee,
} from "@/lib/employees"
import { useDepartments, useDesignations, useLocations } from "@/lib/org"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable, DataTableColumnHeader, type FilterableColumn } from "@/components/data-table"

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "success" : status === "inactive" ? "warning" : ("secondary" as const)
  return <Badge variant={variant} className="capitalize">{status}</Badge>
}

export default function EmployeesPage() {
  const router = useRouter()
  const q = useEmployees({ first: 200 })
  const depts = useDepartments()
  const desigs = useDesignations()
  const locs = useLocations()

  const employees = q.data?.edges.map((e) => e.node) ?? []

  const deptName = (id: string | null) =>
    id ? (depts.data?.find((d) => d.id === id)?.name ?? "\u2014") : "\u2014"
  const desigTitle = (id: string | null) =>
    id ? (desigs.data?.find((d) => d.id === id)?.title ?? "\u2014") : "\u2014"
  const locName = (id: string | null) =>
    id ? (locs.data?.find((l) => l.id === id)?.name ?? "\u2014") : "\u2014"

  const columns: ColumnDef<Employee>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "employeeCode",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("employeeCode")}</span>,
    },
    {
      id: "name",
      accessorFn: (row) => employeeName(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{employeeName(row.original)}</p>
          {row.original.email && (
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          )}
        </div>
      ),
    },
    {
      id: "department",
      accessorFn: (row) => deptName(row.departmentId),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ row }) => <span className="text-muted-foreground">{deptName(row.original.departmentId)}</span>,
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true
        return value.includes(row.original.departmentId)
      },
    },
    {
      id: "designation",
      accessorFn: (row) => desigTitle(row.designationId),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Designation" />,
      cell: ({ row }) => <span className="text-muted-foreground">{desigTitle(row.original.designationId)}</span>,
    },
    {
      id: "location",
      accessorFn: (row) => locName(row.locationId),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => <span className="text-muted-foreground">{locName(row.original.locationId)}</span>,
    },
    {
      accessorKey: "joiningDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Joining" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("joiningDate")}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true
        return value.includes(row.getValue(id))
      },
    },
  ]

  const filterableColumns: FilterableColumn[] = [
    {
      columnId: "status",
      title: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    ...(depts.data
      ? [{
          columnId: "department",
          title: "Department",
          options: depts.data.map((d) => ({ label: d.name, value: d.id })),
        }]
      : []),
  ]

  if (q.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  }
  if (q.error) {
    return <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {q.data ? `${q.data.totalCount} employee${q.data.totalCount !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <UserCircle className="h-10 w-10" />
          <p className="text-sm">No employees found.</p>
          <Link href="/employees/new">
            <Button size="sm"><Plus className="h-4 w-4" /> Add the first employee</Button>
          </Link>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          searchKey="name"
          searchPlaceholder="Filter employees..."
          filterableColumns={filterableColumns}
          onRowClick={(emp) => router.push(`/employees/${emp.id}`)}
        />
      )}
    </div>
  )
}
