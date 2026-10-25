import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">404</p>
      <h1 className="mt-4 text-3xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The page you requested does not exist or is no longer published.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex w-fit rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        Return home
      </Link>
    </main>
  );
}
