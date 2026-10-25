import Link from "next/link";
import { ArrowRight, BookOpen, FolderKanban, Images, Mail, Plus, Settings } from "lucide-react";

import { AdminPageHeader, StatCard, StatusBadge } from "@/components/admin/page-parts";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent, CardHeader, CardTitle, LabelCaps } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/content";
import { getSetupStatus } from "@/lib/env";
import { getMessageStats } from "@/lib/queries/messages";
import { getPostStats, getRecentAdminPosts } from "@/lib/queries/posts";
import { getProjectStats } from "@/lib/queries/projects";
import { getSiteSettingsWithStatus } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [postStats, projectStats, messages, recentPosts, settingsStatus] = await Promise.all([
    getPostStats(),
    getProjectStats(),
    getMessageStats(),
    getRecentAdminPosts(5),
    getSiteSettingsWithStatus(),
  ]);

  const setup = getSetupStatus();
  const databaseReachable = postStats.ok || projectStats.ok || messages.ok;
  const unread = messages.ok ? messages.data.unread : 0;

  const setupTasks = [
    {
      label: "Supabase environment configured",
      done: setup.configured,
      hint: setup.configured ? null : `Missing: ${setup.missing.join(", ")}`,
    },
    {
      label: "Database migrations applied",
      done: databaseReachable,
      hint: databaseReachable ? null : "Run supabase/migrations/*.sql against your project.",
    },
    {
      label: "Site settings stored in the database",
      done: settingsStatus.fromDatabase,
      hint: settingsStatus.fromDatabase ? null : "Save the settings form once to seed your copy.",
    },
    {
      label: "Service role key available (media maintenance)",
      done: setup.hasServiceRole,
      hint: setup.hasServiceRole ? null : "Optional, but recommended for server-side media tasks.",
    },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Control room"
        description="Everything here is read live from PostgreSQL. Numbers update as you publish, edit and delete."
        actions={
          <>
            <Button asChild size="sm" variant="subtle">
              <Link href="/admin/posts/new">
                <Plus className="size-3.5" aria-hidden /> New article
              </Link>
            </Button>
            <Button asChild size="sm" variant="accent">
              <Link href="/admin/projects/new">
                <Plus className="size-3.5" aria-hidden /> New project
              </Link>
            </Button>
          </>
        }
      />

      {!databaseReachable ? (
        <Alert tone="warning" title="The database is not reachable" className="mb-6">
          Statistics below cannot be loaded. Check that the Supabase project is running, that the
          migrations have been applied, and that this environment can reach your project URL.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articles"
          value={postStats.ok ? postStats.data.total : "—"}
          hint={
            postStats.ok
              ? `${postStats.data.published} published · ${postStats.data.drafts} draft${
                  postStats.data.drafts === 1 ? "" : "s"
                }`
              : "Unavailable"
          }
          href="/admin/posts"
        />
        <StatCard
          label="Projects"
          value={projectStats.ok ? projectStats.data.total : "—"}
          hint={
            projectStats.ok
              ? `${projectStats.data.published} visible · ${projectStats.data.hidden} hidden`
              : "Unavailable"
          }
          href="/admin/projects"
        />
        <StatCard
          label="Messages"
          value={messages.ok ? messages.data.total : "—"}
          hint={messages.ok ? `${unread} unread` : "Unavailable"}
          href="/admin/messages"
          tone={unread > 0 ? "accent" : "default"}
        />
        <StatCard
          label="Content status"
          value={postStats.ok && postStats.data.published > 0 ? "Live" : "Quiet"}
          hint={
            postStats.ok && postStats.data.published > 0
              ? "Published articles are visible to visitors."
              : "Nothing published yet — drafts stay private."
          }
          href="/admin/posts"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent articles</CardTitle>
            <Link
              href="/admin/posts"
              className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              Manage <ArrowRight className="size-3" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {!recentPosts.ok ? (
              <p className="text-sm text-muted">Articles could not be loaded.</p>
            ) : recentPosts.data.length === 0 ? (
              <div className="rounded-md border border-dashed border-line-strong p-6 text-sm text-muted">
                No articles yet.{" "}
                <Link href="/admin/posts/new" className="text-accent underline underline-offset-4">
                  Write the first one
                </Link>
                .
              </div>
            ) : (
              <ul className="divide-y divide-line/70">
                {recentPosts.data.map((post) => (
                  <li key={post.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="block truncate text-sm font-medium text-foreground hover:text-accent"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-soft">
                        /{post.slug} · updated {formatDateTime(post.updated_at)}
                      </p>
                    </div>
                    <StatusBadge status={post.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!messages.ok ? (
              <p className="text-sm text-muted">Messages could not be loaded.</p>
            ) : messages.data.recent.length === 0 ? (
              <p className="text-sm text-muted">No messages yet. Submissions from the contact form land here.</p>
            ) : (
              messages.data.recent.map((message) => (
                <Link
                  key={message.id}
                  href="/admin/messages"
                  className="block rounded-md border border-line bg-background/50 p-3 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-foreground">{message.subject}</p>
                    {message.is_read ? null : (
                      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-[0.7rem] text-muted">{message.name}</p>
                </Link>
              ))
            )}
            <Button asChild variant="ghost" size="sm" className="w-full justify-start px-1">
              <Link href="/admin/messages">
                <Mail className="size-3.5" aria-hidden /> Open inbox
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { href: "/admin/posts/new", label: "Write an article", icon: BookOpen },
              { href: "/admin/projects/new", label: "Add a project", icon: FolderKanban },
              { href: "/admin/media", label: "Upload media", icon: Images },
              { href: "/admin/settings", label: "Edit site copy", icon: Settings },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-md border border-line/70 px-3 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
                >
                  <Icon className="size-4 text-muted-soft" aria-hidden />
                  {action.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {setupTasks.map((task) => (
                <li key={task.label} className="flex items-start gap-3 text-sm">
                  <span
                    aria-hidden
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      task.done ? "bg-success" : "bg-[#fbbf24]"
                    }`}
                  />
                  <div>
                    <p className={task.done ? "text-foreground/85" : "text-foreground"}>{task.label}</p>
                    {task.hint ? <p className="mt-0.5 text-xs text-muted-soft">{task.hint}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <LabelCaps>Media path for the hero video</LabelCaps>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Upload a licensed MP4/WebM to the media library, then either copy its public URL into{" "}
                <code className="rounded bg-surface-2 px-1 py-0.5">NEXT_PUBLIC_HERO_VIDEO_URL</code>{" "}
                or place the file at <code className="rounded bg-surface-2 px-1 py-0.5">public/media/hero.mp4</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
