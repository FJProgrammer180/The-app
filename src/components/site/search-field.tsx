"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Server-driven search: submitting updates the URL, so results are shareable,
 * crawlable and rendered on the server.
 */
export function SearchField({
  action,
  defaultValue = "",
  placeholder = "Search articles…",
  hiddenParams = {},
  label = "Search articles",
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  hiddenParams?: Record<string, string | undefined>;
  label?: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(defaultValue);
  const [pending, startTransition] = React.useTransition();

  const submit = (nextValue: string) => {
    const params = new URLSearchParams();
    for (const [key, entry] of Object.entries(hiddenParams)) {
      if (entry) params.set(key, entry);
    }
    if (nextValue.trim()) params.set("q", nextValue.trim());
    startTransition(() => {
      router.push(params.size > 0 ? `${action}?${params.toString()}` : action);
    });
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
      className="relative flex w-full max-w-sm items-center"
    >
      <label htmlFor="site-search" className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 size-4 text-muted-soft"
        aria-hidden
      />
      <Input
        id="site-search"
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9 pr-20"
        autoComplete="off"
      />
      <div className="absolute right-1.5 flex items-center gap-1">
        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              submit("");
            }}
            className="rounded-full p-1.5 text-muted-soft transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
        <Button type="submit" size="sm" variant="subtle" disabled={pending} className="h-7 px-2.5">
          {pending ? "…" : "Search"}
        </Button>
      </div>
    </form>
  );
}
