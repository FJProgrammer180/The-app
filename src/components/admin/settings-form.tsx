"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { updateSiteSettingsAction } from "@/lib/actions/settings";
import { Field, FormSection } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import type { SettingsFormValues } from "@/lib/validation";

type TimelineRow = { year: string; title: string; description: string };

type SettingsFormShape = {
  brand: { name: string; tagline: string };
  home: SettingsFormValues["home"];
  about: {
    display_name: string;
    role: string;
    bio: string;
    learningText: string;
    goalsText: string;
    skillsText: string;
    timeline: TimelineRow[];
  };
  social: { github: string; x: string; linkedin: string; email: string };
  contact: SettingsFormValues["contact"];
};

function toLines(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

function fromLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SettingsForm({ initialValues }: { initialValues: SettingsFormValues }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const defaults: SettingsFormShape = {
    brand: initialValues.brand,
    home: initialValues.home,
    about: {
      display_name: initialValues.about.display_name,
      role: initialValues.about.role,
      bio: initialValues.about.bio,
      learningText: toLines(initialValues.about.learning),
      goalsText: toLines(initialValues.about.goals),
      skillsText: toLines(initialValues.about.skills),
      timeline: initialValues.about.timeline,
    },
    social: {
      github: initialValues.social.github ?? "",
      x: initialValues.social.x ?? "",
      linkedin: initialValues.social.linkedin ?? "",
      email: initialValues.social.email ?? "",
    },
    contact: initialValues.contact,
  };

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormShape>({ defaultValues: defaults });

  const { fields, append, remove } = useFieldArray({ control, name: "about.timeline" });

  const onSubmit = async (values: SettingsFormShape) => {
    setServerError(null);

    const payload = {
      brand: values.brand,
      home: values.home,
      about: {
        display_name: values.about.display_name,
        role: values.about.role,
        bio: values.about.bio,
        learning: fromLines(values.about.learningText),
        goals: fromLines(values.about.goalsText),
        skills: fromLines(values.about.skillsText),
        timeline: values.about.timeline.filter(
          (entry) => entry.year.trim() || entry.title.trim() || entry.description.trim(),
        ),
      },
      social: {
        github: values.social.github,
        x: values.social.x,
        linkedin: values.social.linkedin,
        email: values.social.email,
      },
      contact: values.contact,
    };

    const result = await updateSiteSettingsAction(payload);

    if (!result.ok) {
      setServerError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages[0]) {
            setError(field as keyof SettingsFormShape, { type: "server", message: messages[0] });
          }
        }
      }
      toast.error("Settings not saved", { description: result.error });
      return;
    }

    toast.success("Settings saved", { description: "The public site now uses this copy." });
    reset(values);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <Alert tone="error" title="Settings not saved">
          {serverError}
        </Alert>
      ) : null}
      {isDirty ? (
        <div className="flex items-center gap-2 rounded-md border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] px-4 py-2 text-xs text-[#fbbf24]">
          <span className="size-1.5 rounded-full bg-[#fbbf24]" aria-hidden />
          Unsaved changes
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection title="Brand" description="Used in navigation, metadata and the footer.">
          <Field label="Display name" htmlFor="brand-name" error={errors.brand?.name?.message} required>
            <Input id="brand-name" placeholder="NEXORA" {...register("brand.name", { required: "A brand name is required" })} />
          </Field>
          <Field label="Tagline" htmlFor="brand-tagline" error={errors.brand?.tagline?.message}>
            <Input id="brand-tagline" placeholder="A personal digital universe" {...register("brand.tagline")} />
          </Field>
        </FormSection>

        <FormSection title="Contact section" description="Heading and intro on /contact.">
          <Field label="Heading" htmlFor="contact-heading" error={errors.contact?.heading?.message}>
            <Input id="contact-heading" {...register("contact.heading")} />
          </Field>
          <Field label="Intro" htmlFor="contact-intro" error={errors.contact?.intro?.message}>
            <Textarea id="contact-intro" rows={3} className="min-h-20" {...register("contact.intro")} />
          </Field>
        </FormSection>
      </div>

      <FormSection title="Homepage hero" description="The first thing a visitor reads.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Eyebrow" htmlFor="home-eyebrow" error={errors.home?.eyebrow?.message}>
            <Input id="home-eyebrow" {...register("home.eyebrow")} />
          </Field>
          <Field label="Headline" htmlFor="home-headline" error={errors.home?.headline?.message} required>
            <Input
              id="home-headline"
              {...register("home.headline", { required: "A headline is required" })}
            />
          </Field>
        </div>
        <Field label="Introduction" htmlFor="home-intro" error={errors.home?.intro?.message}>
          <Textarea id="home-intro" rows={4} {...register("home.intro")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Primary CTA label" htmlFor="home-primary-label" error={errors.home?.primary_cta_label?.message}>
            <Input id="home-primary-label" {...register("home.primary_cta_label")} />
          </Field>
          <Field label="Primary CTA path" htmlFor="home-primary-href" error={errors.home?.primary_cta_href?.message} hint="/projects">
            <Input id="home-primary-href" {...register("home.primary_cta_href")} />
          </Field>
          <Field label="Secondary CTA label" htmlFor="home-secondary-label" error={errors.home?.secondary_cta_label?.message}>
            <Input id="home-secondary-label" {...register("home.secondary_cta_label")} />
          </Field>
          <Field label="Secondary CTA path" htmlFor="home-secondary-href" error={errors.home?.secondary_cta_href?.message} hint="/blog">
            <Input id="home-secondary-href" {...register("home.secondary_cta_href")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="About" description="Public profile content. Keep entries factual.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" htmlFor="about-name" error={errors.about?.display_name?.message} required>
            <Input
              id="about-name"
              {...register("about.display_name", { required: "A display name is required" })}
            />
          </Field>
          <Field label="Role" htmlFor="about-role" error={errors.about?.role?.message}>
            <Input id="about-role" placeholder="Software engineer" {...register("about.role")} />
          </Field>
        </div>
        <Field label="Biography" htmlFor="about-bio" error={errors.about?.bio?.message}>
          <Textarea id="about-bio" rows={6} {...register("about.bio")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Learning" htmlFor="about-learning" hint="one per line">
            <Textarea id="about-learning" rows={5} {...register("about.learningText")} />
          </Field>
          <Field label="Goals" htmlFor="about-goals" hint="one per line">
            <Textarea id="about-goals" rows={5} {...register("about.goalsText")} />
          </Field>
          <Field label="Skills" htmlFor="about-skills" hint="one per line">
            <Textarea id="about-skills" rows={5} {...register("about.skillsText")} />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[0.8125rem] font-medium text-foreground/90">Timeline</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => append({ year: "", title: "", description: "" })}
            >
              <Plus className="size-3.5" aria-hidden /> Add entry
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-xs text-muted">
              No timeline entries. Add milestones only if they are factual.
            </p>
          ) : (
            <ul className="space-y-3">
              {fields.map((field, index) => (
                <li key={field.id} className="rounded-md border border-line bg-background/40 p-3">
                  <div className="grid gap-3 sm:grid-cols-[6rem_1fr_auto]">
                    <Input placeholder="2026" aria-label={`Timeline year ${index + 1}`} {...register(`about.timeline.${index}.year` as const)} />
                    <Input placeholder="Milestone" aria-label={`Timeline title ${index + 1}`} {...register(`about.timeline.${index}.title` as const)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove timeline entry ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    className="mt-2 min-h-16"
                    placeholder="What happened, in one or two sentences."
                    aria-label={`Timeline description ${index + 1}`}
                    {...register(`about.timeline.${index}.description` as const)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </FormSection>

      <FormSection title="Social links" description="Only valid URLs are rendered on the public site.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="GitHub" htmlFor="social-github" error={errors.social?.github?.message}>
            <Input id="social-github" type="url" placeholder="https://github.com/…" {...register("social.github")} />
          </Field>
          <Field label="X" htmlFor="social-x" error={errors.social?.x?.message}>
            <Input id="social-x" type="url" placeholder="https://x.com/…" {...register("social.x")} />
          </Field>
          <Field label="LinkedIn" htmlFor="social-linkedin" error={errors.social?.linkedin?.message}>
            <Input id="social-linkedin" type="url" placeholder="https://linkedin.com/in/…" {...register("social.linkedin")} />
          </Field>
          <Field label="Contact email" htmlFor="social-email" error={errors.social?.email?.message}>
            <Input id="social-email" type="email" placeholder="hello@example.com" {...register("social.email")} />
          </Field>
        </div>
      </FormSection>

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-surface/90 p-3 backdrop-blur-md">
        <p className="hidden text-xs text-muted sm:block">
          Stored in <code className="rounded bg-surface-2 px-1 py-0.5">site_settings</code> and applied
          across the public site.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => reset(defaults)} disabled={isSubmitting}>
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
