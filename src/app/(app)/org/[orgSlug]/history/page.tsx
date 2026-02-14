import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Star, MessageSquare, Clock, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "--";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-muted-foreground">No rating</span>;
  }
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  ERRORED: "destructive",
  ESCALATED: "outline",
};

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) redirect("/dashboard");

  const userId = session.user.id;

  const pageSize = 20;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (currentPage - 1) * pageSize;

  const [conversations, totalCount] = await Promise.all([
    db.conversation.findMany({
      where: { orgId: org.id, userId },
      include: {
        agent: { select: { name: true } },
      },
      orderBy: { startedAt: "desc" },
      take: pageSize,
      skip,
    }),
    db.conversation.count({
      where: { orgId: org.id, userId },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Conversation History
          </h1>
          <p className="mt-1 text-muted-foreground">
            Review your past conversations
          </p>
        </div>
      </div>

      {/* Conversation List */}
      {conversations.length === 0 && currentPage === 1 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No conversations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a conversation with one of your agents.
          </p>
          <Link href={`/org/${orgSlug}/talk`}>
            <Button className="mt-6">Talk to an Agent</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/org/${orgSlug}/history/${conv.id}`}
              >
                <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-semibold leading-tight">
                          {conv.agent.name}
                        </CardTitle>
                      </div>
                      <Badge variant={STATUS_VARIANT[conv.status] ?? "secondary"}>
                        {conv.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatDistanceToNow(conv.startedAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        <span>{formatDuration(conv.durationSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                          {conv.messageCount}{" "}
                          {conv.messageCount === 1 ? "message" : "messages"}
                        </span>
                      </div>
                      <RatingStars rating={conv.rating} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalCount}{" "}
                {totalCount === 1 ? "conversation" : "conversations"})
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={`/org/${orgSlug}/history?page=${currentPage - 1}`}
                  >
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={`/org/${orgSlug}/history?page=${currentPage + 1}`}
                  >
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
