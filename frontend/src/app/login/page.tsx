"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { login } from "@/lib/auth"
import { tokens } from "@/lib/auth-tokens"
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
import { AuthBrandPanel } from "@/components/auth/brand-panel"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const m = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      tokens.setBoth(res.accessToken, res.refreshToken)
      toast.success("Signed in successfully")
      router.replace("/dashboard")
    },
    onError: (err) => {
      toast.error("Sign in failed", { description: err.message })
    },
  })

  return (
    <div className="relative grid min-h-svh grid-cols-1 bg-background text-foreground lg:grid-cols-2">
      <Link
        href="/register"
        className="absolute right-4 top-4 z-30 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground hover:bg-accent md:right-8 md:top-8"
      >
        Create account
      </Link>

      <AuthBrandPanel />

      <div className="flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-[400px] rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your work email and password.
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@acme.com"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting || m.isPending}
              >
                {m.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Create an account
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
