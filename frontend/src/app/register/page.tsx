"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register as registerUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthBrandPanel } from "@/components/auth/brand-panel"

const schema = z.object({
  tenantName: z.string().min(2, "At least 2 characters").max(255, "Too long"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const m = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      router.push("/login")
    },
  })

  return (
    <div className="relative grid min-h-svh grid-cols-1 bg-slate-50 text-slate-900 lg:grid-cols-2">
      <Link
        href="/login"
        className="absolute right-4 top-4 z-30 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-slate-700 hover:bg-white md:right-8 md:top-8"
      >
        Sign in
      </Link>

      <AuthBrandPanel />

      <div className="flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-slate-600">
              Set up your organization and your admin login.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={handleSubmit((v) => m.mutate(v))}
            noValidate
          >
            <div className="space-y-1">
              <Label htmlFor="tenantName">Organization name</Label>
              <Input
                id="tenantName"
                autoComplete="organization"
                placeholder="Acme Inc"
                {...register("tenantName")}
              />
              {errors.tenantName && (
                <p className="text-xs text-red-600">{errors.tenantName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@acme.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {m.error && (
              <p className="text-sm text-red-600">{(m.error as Error).message}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || m.isPending}
            >
              {m.isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            By clicking continue, you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
