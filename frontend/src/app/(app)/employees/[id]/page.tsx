"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react"
import {
  useEmployee,
  useEmployees,
  useDeleteEmployee,
  employeeName,
  formatDate,
} from "@/lib/employees"
import { useUserRoles, useRoles, useAssignRole, useRevokeRole } from "@/lib/roles"
import { useViewer, useHasPermission } from "@/lib/viewer"
import { useDepartments, useDesignations, useLocations } from "@/lib/org"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const q = useEmployee(id)
  const emp = q.data
  const viewer = useViewer()
  const canManageRbac = useHasPermission("rbac.manage")

  const depts = useDepartments()
  const desigs = useDesignations()
  const locs = useLocations()

  const reportsQ = useEmployees({ first: 100, filter: { managerId: id } })
  const reports = reportsQ.data?.edges.map((e) => e.node) ?? []
  const managerQ = useEmployee(emp?.managerId ?? undefined)

  // Roles (only fetch when user is linked)
  const userRolesQ = useUserRoles(emp?.userId ?? undefined)
  const userRoles = userRolesQ.data ?? []
  const allRolesQ = useRoles()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [assignRoleId, setAssignRoleId] = useState<string | undefined>(undefined)

  const del = useDeleteEmployee({
    onSuccess: () => { toast.success("Employee archived"); router.push("/employees") },
    onError: (err) => { toast.error("Archive failed", { description: (err as Error).message }) },
  })

  const assignRole = useAssignRole({
    onSuccess: () => {
      toast.success("Role assigned")
      toast.info("Changes take effect on next login", { duration: 5000 })
      setAssignRoleId(undefined)
    },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })

  const revokeRole = useRevokeRole({
    onSuccess: () => {
      toast.success("Role removed")
      toast.info("Changes take effect on next login", { duration: 5000 })
    },
    onError: (err) => { toast.error("Failed", { description: err.message }) },
  })

  const deptName = (did: string | null) =>
    did ? (depts.data?.find((d) => d.id === did)?.name ?? "\u2014") : "\u2014"
  const desigTitle = (did: string | null) =>
    did ? (desigs.data?.find((d) => d.id === did)?.title ?? "\u2014") : "\u2014"
  const locName = (lid: string | null) =>
    lid ? (locs.data?.find((l) => l.id === lid)?.name ?? "\u2014") : "\u2014"

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (q.error) return <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
  if (!emp) return <div className="p-6 text-sm text-muted-foreground">Employee not found.</div>

  const statusVariant = emp.status === "active" ? "success" : emp.status === "inactive" ? "warning" : ("secondary" as const)
  const isOwnUser = viewer.data?.userId === emp.userId && emp.userId !== null
  const assignableRoles = (allRolesQ.data ?? []).filter(
    (r) => r.status === "active" && !userRoles.some((ur) => ur.roleId === r.id),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{employeeName(emp)}</h1>
              <Badge variant={statusVariant} className="capitalize">{emp.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{emp.employeeCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/employees/${id}/edit`}>
            <Button variant="secondary"><Pencil className="h-4 w-4" /> Edit</Button>
          </Link>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Archive
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {canManageRbac && <TabsTrigger value="roles">Roles & Access</TabsTrigger>}
          {reports.length > 0 && <TabsTrigger value="reports">Direct Reports ({reports.length})</TabsTrigger>}
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow icon={Mail} label="Email" value={emp.email} />
                  <InfoRow icon={Phone} label="Phone" value={emp.phone} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={emp.dateOfBirth} />
                  <InfoRow icon={User} label="Gender" value={emp.gender} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Employment</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <InfoRow icon={Calendar} label="Joining Date" value={emp.joiningDate} />
                  <InfoRow icon={Tag} label="Type" value={emp.employmentType?.replace("_", " ")} />
                  <InfoRow icon={Building2} label="Department" value={deptName(emp.departmentId)} />
                  <InfoRow icon={Tag} label="Designation" value={desigTitle(emp.designationId)} />
                  <InfoRow icon={MapPin} label="Location" value={locName(emp.locationId)} />
                  <InfoRow icon={User} label="Manager" value={managerQ.data ? employeeName(managerQ.data) : "\u2014"} />
                </dl>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(emp.createdAt)} &middot; Updated {formatDate(emp.updatedAt)}
          </p>
        </TabsContent>

        {/* Roles & Access tab — only visible with rbac.manage */}
        {canManageRbac && (
          <TabsContent value="roles" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  Roles & Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!emp.userId ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      No linked user account.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      When this employee&apos;s email matches a user login, the account is linked automatically on creation.
                      This employee has no matching user account.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Linked to User ID:</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{emp.userId}</code>
                    </div>

                    {/* Current roles */}
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Assigned Roles</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {userRoles.length === 0 && (
                          <p className="text-sm text-muted-foreground">No roles assigned.</p>
                        )}
                        {userRoles.map((ur) => (
                          <Badge key={ur.roleId} variant="secondary" className="gap-1.5 pr-1">
                            {ur.roleName}
                            <button
                              type="button"
                              className="ml-0.5 rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
                              disabled={revokeRole.isPending || (isOwnUser && ur.roleName === "Admin")}
                              title={isOwnUser && ur.roleName === "Admin" ? "Cannot remove your own Admin role" : "Remove role"}
                              onClick={() => revokeRole.mutate({ userId: emp.userId!, roleId: ur.roleId })}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Assign new role */}
                    {assignableRoles.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-foreground">Assign Role</p>
                        <div className="flex items-center gap-2">
                          <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                            <SelectTrigger className="h-9 w-56">
                              <SelectValue placeholder="Select a role..." />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            disabled={!assignRoleId || assignRole.isPending}
                            onClick={() => {
                              if (assignRoleId && emp.userId) {
                                assignRole.mutate({ userId: emp.userId, roleId: assignRoleId })
                              }
                            }}
                          >
                            {assignRole.isPending ? "Assigning..." : "Assign"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Direct Reports tab */}
        {reports.length > 0 && (
          <TabsContent value="reports" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Direct Reports ({reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-4 text-xs uppercase tracking-wide">Name</TableHead>
                      <TableHead className="px-4 text-xs uppercase tracking-wide">Code</TableHead>
                      <TableHead className="px-4 text-xs uppercase tracking-wide">Designation</TableHead>
                      <TableHead className="px-4 text-xs uppercase tracking-wide">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/employees/${r.id}`)}>
                        <TableCell className="px-4 font-medium">{employeeName(r)}</TableCell>
                        <TableCell className="px-4 text-muted-foreground">{r.employeeCode}</TableCell>
                        <TableCell className="px-4 text-muted-foreground">{desigTitle(r.designationId)}</TableCell>
                        <TableCell className="px-4">
                          <Badge variant={r.status === "active" ? "success" : "warning"} className="capitalize">{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Archive employee?</DialogTitle>
              <DialogDescription>
                &ldquo;{employeeName(emp)}&rdquo; will be marked as deleted.
                This is a soft-delete — the record stays for audit history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={del.isPending}>Cancel</Button>
              <Button variant="destructive" onClick={() => del.mutate(id)} disabled={del.isPending}>
                {del.isPending ? "Archiving..." : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground capitalize">
          {value || "\u2014"}
        </dd>
      </div>
    </div>
  )
}
