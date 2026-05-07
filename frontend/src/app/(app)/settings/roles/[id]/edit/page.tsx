"use client"

import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useRole, useUpdateRole } from "@/lib/roles"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

export default function EditRolePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const q = useRole(id)

  const update = useUpdateRole({
    onSuccess: () => {
      toast.success("Role updated")
      router.push(`/settings/roles/${id}`)
    },
    onError: (err) => {
      toast.error("Failed to update role", { description: err.message })
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: q.data?.name ?? "",
      description: q.data?.description ?? "",
    },
  })

  if (q.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (q.error) return <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
  if (!q.data) return <div className="p-6 text-sm text-muted-foreground">Role not found.</div>

  const onSubmit = (v: FormValues) => {
    update.mutate({
      id,
      input: {
        name: v.name,
        description: v.description?.trim() || undefined,
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Edit role</h2>
        <p className="text-sm text-muted-foreground">
          Update {q.data.name}&apos;s details.
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
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
