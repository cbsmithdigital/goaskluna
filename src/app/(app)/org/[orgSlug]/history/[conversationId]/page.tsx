import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Bot,
  User,
  Clock,
  Calendar,
  Star,
  MessageSquare,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMessageTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ACTIVE: { label: "Active", variant: "default" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  ERRORED: { label: "Error", variant: "destructive" },
  ESCALATED: { label: "Escalated", variant: "outline" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; conversationId: string }>;
}) {
  const { orgSlug, conversationId } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) redirect("/dashboard");

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, orgId: org.id },
    include: {
      agent: { select: { name: true } },
      user: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) redirect(`/org/${orgSlug}/history`);

  const statusInfo = statusConfig[conversation.status] ?? {
    label: conversation.status,
    variant: "outline" as const,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back navigation */}
      <Link
        href={`/org/${orgSlug}/history`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to History
      </Link>

      {/* Conversation header card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-5 w-5 text-primary" />
                {conversation.agent.name}
              </CardTitle>
              {conversation.user?.name && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {conversation.user.name}
                </p>
              )}
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(conversation.startedAt)}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(conversation.durationSeconds)}</span>
            </div>

            {/* Message count */}
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>
                {conversation.messages.length}{" "}
                {conversation.messages.length === 1 ? "message" : "messages"}
              </span>
            </div>

            {/* Rating */}
            {conversation.rating != null && conversation.rating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" />
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3.5 w-3.5 ${
                        star <= (conversation.rating ?? 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/25"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback quote */}
          {conversation.feedback && (
            <div className="mt-4 rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Feedback
              </p>
              <p className="mt-1 text-sm italic text-foreground">
                &ldquo;{conversation.feedback}&rdquo;
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5 text-primary" />
          Transcript
        </h3>

        {conversation.messages.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed py-12">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No messages recorded for this conversation.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversation.messages.map((message) => {
              const isUser = message.role === "USER";
              const isSystem = message.role === "SYSTEM";

              if (isSystem) {
                return (
                  <div
                    key={message.id}
                    className="flex justify-center"
                  >
                    <div className="max-w-[85%] rounded-lg border border-dashed bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
                      <span className="font-medium">System</span>
                      <span className="mx-1.5">&middot;</span>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      <p className="mt-1">{message.content}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] space-y-1 ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Role label + timestamp */}
                    <div
                      className={`flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <Bot className="h-3 w-3 text-primary" />
                      )}
                      <span className="font-medium">
                        {isUser ? "You" : conversation.agent.name}
                      </span>
                      <span>&middot;</span>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {isUser && (
                        <User className="h-3 w-3" />
                      )}
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>

                    {/* Metadata indicators */}
                    {(message.wasNoAnswer || message.wasEscalation) && (
                      <div className="flex gap-1.5 px-1">
                        {message.wasNoAnswer && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            No answer
                          </Badge>
                        )}
                        {message.wasEscalation && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Escalation
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
