"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useCreateRole, usePermissions } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional().or(z.literal("")),
  permissionIds: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

export default function NewRolePage() {
  const router = useRouter()
  const permsQ = usePermissions()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", permissionIds: [] },
  })

  const create = useCreateRole({
    onSuccess: () => {
      toast.success("Role created")
      router.push("/settings/roles")
    },
    onError: (err) => {
      toast.error("Failed to create role", { description: err.message })
    },
  })

  const onSubmit = (v: FormValues) => {
    create.mutate({
      name: v.name,
      description: v.description?.trim() || undefined,
      permissionIds: v.permissionIds,
    })
  }

  const perms = permsQ.data ?? []
  const groups = perms.reduce<Record<string, typeof perms>>((acc, p) => {
    const domain = p.key.split(".")[0]
    ;(acc[domain] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create role</h2>
        <p className="text-sm text-muted-foreground">
          Define a role and select the permissions it grants.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="HR Manager" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Input placeholder="Can manage employee records" {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              {permsQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading permissions...</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groups).map(([domain, items]) => (
                    <div key={domain} className="space-y-3">
                      <h3 className="text-sm font-semibold capitalize text-foreground">
                        {domain}
                      </h3>
                      <div className="space-y-2">
                        {items.map((p) => (
                          <FormField
                            key={p.id}
                            control={form.control}
                            name="permissionIds"
                            render={({ field }) => (
                              <FormItem className="flex items-start gap-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value.includes(p.id)}
                                    onCheckedChange={(checked) => {
                                      const next = checked
                                        ? [...field.value, p.id]
                                        : field.value.filter((v: string) => v !== p.id)
                                      field.onChange(next)
                                    }}
                                  />
                                </FormControl>
                                <div className="leading-none">
                                  <FormLabel className="font-normal">{p.key}</FormLabel>
                                  {p.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {p.description}
                                    </p>
                                  )}
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create role"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
