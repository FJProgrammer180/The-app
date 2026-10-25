import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-parts";
import { MessageList } from "@/components/admin/message-list";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { listAdminMessages } from "@/lib/queries/messages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const result = await listAdminMessages();
  const messages = result.ok ? result.data : [];
  const unread = messages.filter((message) => !message.is_read).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Contact submissions from the public form. Only administrators can read these rows — there is no public endpoint."
        actions={
          result.ok ? (
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-soft">
              {messages.length} total · {unread} unread
            </p>
          ) : null
        }
      />

      {!result.ok ? (
        <Alert tone="error" title="Messages could not be loaded">
          {result.error}
        </Alert>
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="When someone submits the contact form, the message is stored in PostgreSQL and appears here."
        />
      ) : (
        <MessageList messages={messages} />
      )}
    </>
  );
}
