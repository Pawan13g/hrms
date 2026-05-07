"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { register as registerUser } from "@/lib/auth"
import { useCountries } from "@/lib/org"
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
import { AuthBrandPanel } from "@/components/auth/brand-panel"

const schema = z.object({
  tenantName: z.string().min(2, "At least 2 characters").max(255, "Too long"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  countryId: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const countriesQ = useCountries()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantName: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      countryId: "",
    },
  })

  const m = useMutation({
    mutationFn: (v: FormValues) =>
      registerUser({
        tenantName: v.tenantName,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        password: v.password,
        countryId: v.countryId ? Number(v.countryId) : null,
      }),
    onSuccess: () => {
      toast.success("Account created", { description: "You can now sign in." })
      router.push("/login")
    },
    onError: (err) => {
      toast.error("Registration failed", { description: err.message })
    },
  })

  return (
    <div className="relative grid min-h-svh grid-cols-1 bg-background text-foreground lg:grid-cols-2">
      <Link
        href="/login"
        className="absolute right-4 top-4 z-30 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground hover:bg-accent md:right-8 md:top-8"
      >
        Sign in
      </Link>

      <AuthBrandPanel />

      <div className="flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-[480px] rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up your organization and admin login.
            </p>
          </div>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((v) => m.mutate(v))}
              noValidate
            >
              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization name</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization" placeholder="Acme Inc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input autoComplete="given-name" placeholder="Jane" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input autoComplete="family-name" placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="you@acme.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={countriesQ.isLoading ? "Loading..." : "Select country"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {countriesQ.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting || m.isPending}
              >
                {m.isPending ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
