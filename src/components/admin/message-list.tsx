"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MailOpen } from "lucide-react";

import { deleteMessageAction, setMessageReadAction } from "@/lib/actions/messages";
import { formatDateTime } from "@/lib/content";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { ContactMessage } from "@/types";

export function MessageList({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [openId, setOpenId] = React.useState<string | null>(messages.find((m) => !m.is_read)?.id ?? null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const toggleRead = async (message: ContactMessage) => {
    setPendingId(message.id);
    const result = await setMessageReadAction(message.id, !message.is_read);
    setPendingId(null);
    if (!result.ok) {
      toast.error("Update failed", { description: result.error });
      return;
    }
    toast.success(message.is_read ? "Marked as unread" : "Marked as read");
    router.refresh();
  };

  return (
    <ul className="space-y-3">
      {messages.map((message) => {
        const expanded = openId === message.id;
        return (
          <li
            key={message.id}
            className={cn(
              "overflow-hidden rounded-lg border bg-surface/40 transition-colors",
              message.is_read ? "border-line" : "border-accent/30",
            )}
          >
            <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : message.id)}
                className="min-w-0 flex-1 text-left"
                aria-expanded={expanded}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{message.subject}</p>
                  {message.is_read ? null : <Badge variant="accent">New</Badge>}
                </div>
                <p className="mt-1 truncate text-xs text-muted">
                  {message.name} · {message.email}
                </p>
                <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-soft">
                  {formatDateTime(message.created_at)}
                </p>
              </button>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void toggleRead(message)}
                  disabled={pendingId === message.id}
                  aria-label={message.is_read ? "Mark as unread" : "Mark as read"}
                >
                  {message.is_read ? (
                    <Mail className="size-3.5" aria-hidden />
                  ) : (
                    <MailOpen className="size-3.5" aria-hidden />
                  )}
                  <span className="hidden sm:inline">{message.is_read ? "Unread" : "Read"}</span>
                </Button>
                <ConfirmDialog
                  title="Delete this message?"
                  description={`The message from ${message.name} will be permanently removed.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    const result = await deleteMessageAction(message.id);
                    if (!result.ok) {
                      toast.error("Delete failed", { description: result.error });
                      return;
                    }
                    toast.success("Message deleted");
                    router.refresh();
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/10 hover:text-danger"
                    >
                      Delete
                    </Button>
                  }
                />
              </div>
            </div>

            {expanded ? (
              <div className="border-t border-line/70 bg-background/40 px-4 py-4 sm:px-5">
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                  {message.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                    className="text-xs text-accent underline underline-offset-4"
                  >
                    Reply by email
                  </a>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
