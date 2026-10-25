"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { signInAction } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/primitives";

type LoginValues = { email: string; password: string };

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/admin";
  const errorParam = searchParams.get("error");

  const [serverError, setServerError] = React.useState<string | null>(null);

  const earlyMessage =
    errorParam === "not_configured"
      ? "Supabase environment variables are missing. Configure them before signing in."
      : errorParam === "not_authorized"
        ? "That account is signed in but is not on the administrator allowlist."
        : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    const result = await signInAction({ ...values, next: nextPath });
    // A successful sign-in redirects inside the action and never returns here.
    if (result && !result.ok) {
      setServerError(result.error);
      toast.error("Sign in failed", { description: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {earlyMessage ? (
        <Alert tone="warning" title="Cannot sign in yet">
          {earlyMessage}
        </Alert>
      ) : null}
      {serverError ? (
        <Alert tone="error" title="Sign in failed">
          {serverError}
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-xs text-danger">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p role="alert" className="text-xs text-danger">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Verifying…" : "Sign in"}
      </Button>
    </form>
  );
}
