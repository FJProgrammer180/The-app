"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { submitContactMessageAction } from "@/lib/actions/messages";
import { contactFormSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/primitives";

type FormInput = z.input<typeof contactFormSchema>;
type FormOutput = z.output<typeof contactFormSchema>;

const FIELDS = ["name", "email", "subject", "message", "website"] as const;

export function ContactForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", website: "" },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: FormOutput) => {
    setServerError(null);
    const result = await submitContactMessageAction(values);

    if (!result.ok) {
      setServerError(result.error);
      if (result.fieldErrors) {
        for (const field of FIELDS) {
          const messages = result.fieldErrors[field];
          if (messages?.[0]) setError(field, { type: "server", message: messages[0] });
        }
      }
      toast.error("Message not sent", { description: result.error });
      return;
    }

    setSent(true);
    reset();
    toast.success("Message sent", { description: "Thank you — your note has been stored." });
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-success/25 bg-success/[0.06] p-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-success">Stored</p>
        <h2 className="mt-3 text-xl font-semibold text-foreground">Your message has been sent.</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          It is now saved in the inbox and only the site owner can read it. Replies go to the email
          address you provided.
        </p>
        <Button variant="outline" size="sm" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError ? (
        <Alert tone="error" title="Message not sent">
          {serverError}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <p id="name-error" role="alert" className="text-xs text-danger">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="text-xs text-danger">
              {errors.email.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="What is this about?"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? "subject-error" : undefined}
          {...register("subject")}
        />
        {errors.subject ? (
          <p id="subject-error" role="alert" className="text-xs text-danger">
            {errors.subject.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={7}
          placeholder="Tell me about the project, the context and what success looks like."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : "message-hint"}
          {...register("message")}
        />
        {errors.message ? (
          <p id="message-error" role="alert" className="text-xs text-danger">
            {errors.message.message}
          </p>
        ) : (
          <p id="message-hint" className="text-xs text-muted-soft">
            Stored privately. Never shown publicly.
          </p>
        )}
      </div>

      {/* Honeypot — hidden from people, filled by naive bots. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button type="submit" size="lg" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send message"}
        </Button>
        <p className="text-xs text-muted-soft">
          Or email directly if you prefer — details in the sidebar.
        </p>
      </div>
    </form>
  );
}
